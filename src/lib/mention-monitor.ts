/**
 * Mention Watcher & Auto-Reply Engine
 *
 * Responsibilities:
 * 1. Monitor mentions/tags for registered users.
 * 2. LLM relevance classification via Groq (qwen/qwen3.8-27b).
 * 3. Daily rate limiting: 1 contribution per calendar day.
 * 4. Velocity throttling: Max 2 replies per 120s cycle with 5-10s random jitter between replies.
 * 5. Backlog Queue: Shifts excess tweets into Supabase backlog queue for subsequent cycles.
 * 6. Code 226 Anti-Spam Protection: Graceful backoff if X automation warning is encountered.
 * 7. Cryptographic Ed25519 payload signing using user's authentic persistent vault key.
 * 8. Push to canonical Technocore room (x-contributions) with duplicate push guard.
 * 9. Dispatch reply with banner image only.
 */

import {
  getRegisteredUsers,
  getExistingContribution,
  getPendingBacklogContributions,
  hasUserContributedOnDate,
  recordNewContribution,
  updateContributionReplyStatus,
  RegisteredUser,
  ContributionRecord,
} from "./supabase/contributions";
import {
  scanUserForTargetMentions,
  fetchFullTweetText,
  DetectedTweetMatch,
} from "./x-watcher";
import { replyToTweetWithBannerOnly } from "./x-agent";
import { classifyContributionText, generateContributionSummary } from "./groq";
import {
  unlockPrivateKeyForAutopilot,
  didFromKeyObject,
  createAgentIdentity,
} from "./crypto";
import { getSupabaseAdmin } from "./supabase/server";
import {
  CANONICAL_TECHNOCORE_ROOM,
  formatContributionText,
  normalizeTweetType,
  buildSignedTechnocorePayload,
  pushContributionToTechnocore,
} from "./technocore-signing";

const MAX_REPLIES_PER_CYCLE = 3;
const MIN_JITTER_MS = 10000; // 10s
const MAX_JITTER_MS = 20000; // 20s

function getRandomJitterMs(): number {
  return (
    Math.floor(Math.random() * (MAX_JITTER_MS - MIN_JITTER_MS + 1)) +
    MIN_JITTER_MS
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CycleSummary {
  timestamp: string;
  registeredUsersChecked: number;
  totalMatchesFound: number;
  newMatchesRecorded: number;
  confirmedByLlm: number;
  rejectedByLlm: number;
  repliesRecordedSent: number;
  repliesRejectedSent: number;
  queuedForNextCycle: number;
  errors: string[];
}

export async function runMentionMonitoringCycle(
  targetHandle: string = process.env.TARGET_MENTION_HANDLE || "haxexbc",
): Promise<CycleSummary> {
  const startTime = new Date().toISOString();
  const summary: CycleSummary = {
    timestamp: startTime,
    registeredUsersChecked: 0,
    totalMatchesFound: 0,
    newMatchesRecorded: 0,
    confirmedByLlm: 0,
    rejectedByLlm: 0,
    repliesRecordedSent: 0,
    repliesRejectedSent: 0,
    queuedForNextCycle: 0,
    errors: [],
  };

  try {
    // Step 1: Fetch registered users from Supabase
    const registeredUsers = await getRegisteredUsers();
    summary.registeredUsersChecked = registeredUsers.length;

    if (registeredUsers.length === 0) {
      console.log(
        "[Monitor] No registered users in Supabase to scan. Skipping cycle.",
      );
      return summary;
    }

    const userMap = new Map<string, RegisteredUser>();
    for (const u of registeredUsers) {
      userMap.set(u.x_handle.toLowerCase().replace(/^@/, ""), u);
    }

    console.log(
      `[Monitor] Starting scan for ${registeredUsers.length} registered user(s) for @${targetHandle} mentions/tags...`,
    );

    // Step 2: Scan registered users for new mentions on X
    for (const user of registeredUsers) {
      try {
        const matches: DetectedTweetMatch[] = await scanUserForTargetMentions(
          user.x_handle,
          targetHandle,
        );

        summary.totalMatchesFound += matches.length;

        for (const match of matches) {
          try {
            const existing = await getExistingContribution(match.tweetId);

            // If already completely processed (replied with banner or rejected), skip
            if (
              existing &&
              (existing.status === "replied" ||
                existing.status === "rejected" ||
                (existing.technocore_push_status === "pushed" &&
                  existing.reply_tweet_id))
            ) {
              continue;
            }

            // If previously evaluated by LLM as not relevant, skip
            if (existing && existing.is_relevant === false) {
              continue;
            }

            // If not yet recorded/evaluated by LLM, evaluate and record now
            if (!existing || existing.is_relevant === undefined) {
              console.log(
                `[Monitor] [NEW CANDIDATE] Detected @${targetHandle} match from @${match.authorHandle}: ${match.tweetUrl}`,
              );

              let fullText = match.content;
              if (match.tweetType === "article" || match.content.length < 50) {
                const fetchedFull = await fetchFullTweetText(match.tweetId);
                if (fetchedFull && fetchedFull.length > fullText.length) {
                  fullText = fetchedFull;
                }
              }

              console.log(
                `[Monitor] Sending post ${match.tweetId} to Groq LLM (qwen/qwen3.8-27b) for classification...`,
              );
              const classification = await classifyContributionText(
                fullText,
                match.authorHandle,
              );

              const isRelevant = classification.isRelevant;
              console.log(
                `[Monitor] [LLM RESULT] Post ${match.tweetId} Relevance: ${isRelevant ? "TRUE (Confirmed Topic)" : "FALSE (Rejected)"} | Raw: "${classification.rawResponse}"`,
              );

              if (isRelevant) {
                summary.confirmedByLlm++;
              } else {
                summary.rejectedByLlm++;
              }

              // Persist evaluation into Supabase queue
              await recordNewContribution({
                tweet_id: match.tweetId,
                tweet_url: match.tweetUrl,
                user_handle: match.authorHandle,
                did: user.did,
                profile_id: user.id,
                content: fullText,
                tweet_type: normalizeTweetType(match.tweetType),
                posted_at: match.postedAt,
                status: isRelevant ? "detected" : "ignored",
                is_relevant: isRelevant,
                llm_model: classification.model,
                llm_response: classification.rawResponse,
                llm_evaluated_at: new Date().toISOString(),
              });

              summary.newMatchesRecorded++;
            }
          } catch (mErr: any) {
            console.error(
              `[Monitor] Error evaluating match ${match.tweetId}:`,
              mErr.message,
            );
          }
        }
      } catch (userErr: any) {
        console.error(
          `[Monitor] Error scanning user @${user.x_handle}:`,
          userErr.message,
        );
      }
    }

    // Step 3: Fetch pending / backlog queue from Supabase (FIFO order)
    const pendingQueue = await getPendingBacklogContributions(20);

    if (pendingQueue.length === 0) {
      console.log("[Monitor] No pending contributions in queue to process.");
      return summary;
    }

    console.log(
      `[Monitor] [QUEUE] ${pendingQueue.length} pending contribution(s) in backlog queue. Processing max ${MAX_REPLIES_PER_CYCLE} this cycle...`,
    );

    let repliesDispatchedThisCycle = 0;
    let rateLimitHalted = false;

    // Step 4: Process up to MAX_REPLIES_PER_CYCLE with 5–10s jitter between replies
    for (let i = 0; i < pendingQueue.length; i++) {
      const item = pendingQueue[i];

      // Velocity Throttling Guard: Max 3 replies per cycle
      if (repliesDispatchedThisCycle >= MAX_REPLIES_PER_CYCLE) {
        const remainingCount = pendingQueue.length - i;
        summary.queuedForNextCycle = remainingCount;
        console.log(
          `[Monitor] [VELOCITY THROTTLE] Limit reached (${MAX_REPLIES_PER_CYCLE} replies dispatched). Shifting ${remainingCount} tweet(s) to backlog queue for next 300s interval.`,
        );
        break;
      }

      if (rateLimitHalted) {
        break;
      }

      // Jitter Delay: 10–20s random sleep before subsequent reply to mimic human activity
      if (repliesDispatchedThisCycle > 0) {
        const jitterMs = getRandomJitterMs();
        console.log(
          `[Monitor] [HUMAN JITTER] Pausing ${(jitterMs / 1000).toFixed(1)}s before next reply to maintain safe velocity...`,
        );
        await sleep(jitterMs);
      }

      try {
        const cleanHandle = item.user_handle.toLowerCase().replace(/^@/, "");
        const user = userMap.get(cleanHandle) || {
          id: item.profile_id || "",
          did: item.did || "",
          x_handle: cleanHandle,
        };

        const postCalendarDate = (
          item.posted_at || new Date().toISOString()
        ).split("T")[0];

        // Check Daily Contribution Limit (Spam Control: 1 per day)
        const alreadyContributedToday = await hasUserContributedOnDate(
          item.user_handle,
          postCalendarDate,
          item.tweet_id,
        );

        if (alreadyContributedToday) {
          // DAILY LIMIT REACHED -> Reject with REJECTED banner
          console.log(
            `[Monitor] [DAILY LIMIT] User @${item.user_handle} already contributed on ${postCalendarDate}. Dispatching REJECTED banner to ${item.tweet_id}...`,
          );

          const replyRes = await replyToTweetWithBannerOnly(
            item.tweet_id,
            "rejected",
          );

          // Handle X Code 226 Anti-Spam Warning Gracefully
          if (
            replyRes.error?.includes("226") ||
            replyRes.error?.includes("AuthorizationError")
          ) {
            console.warn(
              `[Monitor] [X CODE 226] Automation cooldown triggered by X. Halting reply dispatch for this cycle. Tweet ${item.tweet_id} preserved in backlog queue for next 300s interval.`,
            );
            rateLimitHalted = true;
            summary.errors.push(
              `X Code 226 on tweet ${item.tweet_id}: Paused for next cycle`,
            );
            break;
          }

          if (replyRes.success && replyRes.replyTweetId) {
            console.log(
              `[Monitor] [REPLY SENT] Agent replied with REJECTED banner. Reply ID: ${replyRes.replyTweetId}`,
            );
            summary.repliesRejectedSent++;
            repliesDispatchedThisCycle++;

            await updateContributionReplyStatus(item.tweet_id, {
              status: "rejected",
              rejection_reason:
                "Spam control: 1 contribution allowed per calendar day",
              is_relevant: true,
              reply_tweet_id: replyRes.replyTweetId,
              reply_media_id: replyRes.mediaId,
              reply_at: new Date().toISOString(),
            });
          } else {
            console.warn(
              `[Monitor] Rejection reply failed for tweet ${item.tweet_id}:`,
              replyRes.error,
            );
            summary.errors.push(
              `Rejection reply failed for tweet ${item.tweet_id}: ${replyRes.error}`,
            );
          }
        } else {
          // FIRST CONTRIBUTION OF THE DAY -> Accept, auto-sign & push to Technocore
          console.log(
            `[Monitor] [ACCEPTED CONTRIBUTION] User @${item.user_handle} on ${postCalendarDate}. Processing Technocore push & RECORDED banner...`,
          );

          // 1. Generate 10-12 word contribution summary
          const summary10to12Words = await generateContributionSummary(
            item.content || "",
            item.user_handle,
          );
          const room = CANONICAL_TECHNOCORE_ROOM;
          const payloadText = formatContributionText(
            item.user_handle,
            item.tweet_id,
            summary10to12Words,
          );

          // 2. Resolve User's Authentic Signing Key & DID
          let signingKey: { privateKey: any; did: string };
          if (user.encrypted_signing_key) {
            try {
              const userKeyObj = unlockPrivateKeyForAutopilot(
                user.encrypted_signing_key,
              );
              const derivedDid = didFromKeyObject(userKeyObj);
              signingKey = {
                privateKey: userKeyObj,
                did: derivedDid,
              };
            } catch (decErr: any) {
              console.warn(
                `[Monitor] Could not decrypt user vault key for @${item.user_handle}, provisioning persistent key:`,
                decErr.message,
              );
              const passphrase = `agentk-${user.x_handle}-vault2026`;
              const identity = createAgentIdentity(passphrase);
              try {
                const supabase = getSupabaseAdmin();
                await supabase
                  .from("profiles")
                  .update({
                    did: identity.did,
                    encrypted_signing_key: identity.encryptedSigningKey,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", user.id);
              } catch {}
              const userKeyObj = unlockPrivateKeyForAutopilot(
                identity.encryptedSigningKey,
                passphrase,
              );
              signingKey = {
                privateKey: userKeyObj,
                did: identity.did,
              };
            }
          } else {
            console.log(
              `[Monitor] Provisioning persistent vault key for @${item.user_handle}...`,
            );
            const passphrase = `agentk-${user.x_handle}-vault2026`;
            const identity = createAgentIdentity(passphrase);
            try {
              const supabase = getSupabaseAdmin();
              await supabase
                .from("profiles")
                .update({
                  did: identity.did,
                  encrypted_signing_key: identity.encryptedSigningKey,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);
            } catch (err: any) {
              console.warn(
                `[Monitor] Failed to persist key for @${item.user_handle}:`,
                err.message,
              );
            }
            const userKeyObj = unlockPrivateKeyForAutopilot(
              identity.encryptedSigningKey,
              passphrase,
            );
            signingKey = {
              privateKey: userKeyObj,
              did: identity.did,
            };
          }

          // 3. Check if Technocore was already pushed (Duplicate Guard)
          const alreadyPushedInDb =
            item.technocore_push_status === "pushed" ||
            !!item.technocore_pushed_at ||
            (!!item.technocore_payload && !!item.technocore_payload.sig);

          let technocorePush: {
            success: boolean;
            url?: string;
            seq?: number;
            error?: string;
          };
          let signedPayload: any;

          if (alreadyPushedInDb && item.technocore_payload?.sig) {
            console.log(
              `[Monitor] [DUPLICATE GUARD] Contribution for tweet ${item.tweet_id} was already pushed to Technocore (seq: ${item.technocore_seq || item.technocore_payload?.seq}). Reusing stored proof.`,
            );
            technocorePush = {
              success: true,
              url: item.technocore_url,
              seq: item.technocore_seq || item.technocore_payload?.seq,
            };
            signedPayload = item.technocore_payload;
          } else {
            // Cryptographic auto-signing (Ed25519, RFC 8032, strictly matching key & DID)
            signedPayload = buildSignedTechnocorePayload(
              signingKey.privateKey,
              room,
              payloadText,
            );

            // Autonomous Technocore push to canonical room x-contributions (ONCE)
            console.log(
              `[Monitor] Pushing authentic Technocore contribution for @${item.user_handle} (DID: ${signingKey.did})...`,
            );
            technocorePush = await pushContributionToTechnocore(
              room,
              signedPayload,
            );

            // Immediately lock push in database so duplicate pushes can NEVER happen
            if (technocorePush.success) {
              await updateContributionReplyStatus(item.tweet_id, {
                technocore_room: room,
                technocore_url: technocorePush.url,
                technocore_title: payloadText,
                technocore_seq: technocorePush.seq,
                technocore_payload: {
                  ...signedPayload,
                  seq: technocorePush.seq,
                },
                technocore_pushed_at: new Date().toISOString(),
                technocore_push_status: "pushed",
              });
            }
          }

          // 4. Dispatch Agent reply on X with RECORDED banner only
          const replyRes = await replyToTweetWithBannerOnly(
            item.tweet_id,
            "recorded",
          );

          // Handle X Code 226 Anti-Spam Warning Gracefully
          if (
            replyRes.error?.includes("226") ||
            replyRes.error?.includes("AuthorizationError")
          ) {
            console.warn(
              `[Monitor] [X CODE 226] Automation cooldown triggered by X. Technocore proof is safely preserved in DB. Reply will retry on next 120s cycle.`,
            );
            rateLimitHalted = true;
            summary.errors.push(
              `X Code 226 on tweet ${item.tweet_id}: Paused for next cycle`,
            );
            break;
          }

          const pushStatus = technocorePush.success ? "pushed" : "failed";
          const pushError = technocorePush.error || replyRes.error || undefined;

          if (replyRes.success && replyRes.replyTweetId) {
            console.log(
              `[Monitor] [REPLY SENT] Agent replied with RECORDED banner. Reply ID: ${replyRes.replyTweetId}`,
            );
            summary.repliesRecordedSent++;
            repliesDispatchedThisCycle++;

            await updateContributionReplyStatus(item.tweet_id, {
              status: "replied",
              is_relevant: true,
              reply_tweet_id: replyRes.replyTweetId,
              reply_media_id: replyRes.mediaId,
              reply_at: new Date().toISOString(),
              technocore_room: room,
              technocore_url: technocorePush.url,
              technocore_title: payloadText,
              technocore_seq: technocorePush.seq,
              technocore_payload: {
                ...signedPayload,
                seq: technocorePush.seq,
              },
              technocore_pushed_at: technocorePush.success
                ? new Date().toISOString()
                : undefined,
              technocore_push_status: pushStatus,
              error_message: pushError,
            });
          } else {
            console.warn(
              `[Monitor] Agent recorded reply failed for tweet ${item.tweet_id}:`,
              replyRes.error,
            );
            await updateContributionReplyStatus(item.tweet_id, {
              status: "failed",
              is_relevant: true,
              technocore_room: room,
              technocore_url: technocorePush.url,
              technocore_title: payloadText,
              technocore_seq: technocorePush.seq,
              technocore_payload: {
                ...signedPayload,
                seq: technocorePush.seq,
              },
              technocore_pushed_at: technocorePush.success
                ? new Date().toISOString()
                : undefined,
              technocore_push_status: pushStatus,
              error_message: pushError || "Failed to post reply",
            });
            summary.errors.push(
              `Recorded reply failed for tweet ${item.tweet_id}: ${replyRes.error}`,
            );
          }
        }
      } catch (itemErr: any) {
        console.error(
          `[Monitor] Error processing queue item ${item.tweet_id}:`,
          itemErr.message,
        );
        summary.errors.push(
          `Error on tweet ${item.tweet_id}: ${itemErr.message}`,
        );
      }
    }
  } catch (err: any) {
    console.error("[Monitor] Cycle execution error:", err.message);
    summary.errors.push(err.message);
  }

  return summary;
}
