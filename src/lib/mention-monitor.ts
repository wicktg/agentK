/**
 * Mention Monitoring, LLM Classification & Autonomous Reply Orchestration Engine
 * 
 * Rules:
 * 1. Queries Supabase for all registered user accounts.
 * 2. Uses WATCHER credentials to monitor recent tweets/threads/articles for @boomerxbc mentions & photo tags.
 * 3. Retrieves complete text/content.
 * 4. Sends content to Groq LLM (model: qwen/qwen3.8-27b) for strict binary classification (true/false).
 * 5. If FALSE:
 *    - Records as ignored/rejected in Supabase.
 *    - NO reply is made.
 * 6. If TRUE:
 *    - SPAM CONTROL / DAILY LIMIT CHECK:
 *      A user can contribute ONCE per calendar day (not rolling 24h, but per calendar date YYYY-MM-DD).
 *      - If user ALREADY has a recorded contribution on this calendar day:
 *        -> The second/subsequent post is REJECTED.
 *        -> Agent replies attaching ONLY contribution-rejected-banner.png (NO text).
 *        -> Stored in Supabase as status: 'rejected'.
 *      - If user HAS NOT YET contributed on this calendar day:
 *        -> The contribution is ACCEPTED.
 *        -> Agent replies attaching ONLY contribution-recorded-banner.png (NO text).
 *        -> Stored in Supabase as status: 'replied'.
 *        -> Surfaces on the X page calendar.
 */

import {
  getRegisteredUsers,
  getExistingContribution,
  hasUserContributedOnDate,
  recordNewContribution,
  updateContributionReplyStatus,
} from "./supabase/contributions";
import { scanUserForTargetMentions, fetchFullTweetText, DetectedTweetMatch } from "./x-watcher";
import { replyToTweetWithBannerOnly } from "./x-agent";
import { classifyContributionText } from "./groq";

export interface CycleSummary {
  timestamp: string;
  registeredUsersChecked: number;
  totalMatchesFound: number;
  newMatchesRecorded: number;
  confirmedByLlm: number;
  rejectedByLlm: number;
  repliesRecordedSent: number;
  repliesRejectedSent: number;
  errors: string[];
}

export async function runMentionMonitoringCycle(
  targetHandle: string = "boomerxbc"
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
    errors: [],
  };

  try {
    // Step 1: Fetch registered users from Supabase
    const registeredUsers = await getRegisteredUsers();
    summary.registeredUsersChecked = registeredUsers.length;

    if (registeredUsers.length === 0) {
      console.log("[Monitor] No registered users in Supabase to scan. Skipping cycle.");
      return summary;
    }

    console.log(
      `[Monitor] Starting scan for ${registeredUsers.length} registered user(s) for @${targetHandle} mentions/tags...`
    );

    // Step 2: Iterate through each registered user
    for (const user of registeredUsers) {
      try {
        const matches: DetectedTweetMatch[] = await scanUserForTargetMentions(
          user.x_handle,
          targetHandle
        );

        summary.totalMatchesFound += matches.length;

        for (const match of matches) {
          try {
            const existing = await getExistingContribution(match.tweetId);

            // If already processed (replied with recorded or rejected banner), skip
            if (
              existing &&
              (existing.status === "replied" || existing.status === "rejected")
            ) {
              continue;
            }

            // If previously evaluated by LLM as not relevant, skip
            if (existing && existing.is_relevant === false) {
              continue;
            }

            let isRelevant = existing?.is_relevant;

            // If not yet evaluated by LLM, classify now
            if (isRelevant === undefined) {
              console.log(
                `[Monitor] [NEW CANDIDATE] Detected @${targetHandle} match from @${match.authorHandle}: ${match.tweetUrl}`
              );

              let fullText = match.content;
              if (match.tweetType === "article" || match.content.length < 50) {
                const fetchedFull = await fetchFullTweetText(match.tweetId);
                if (fetchedFull && fetchedFull.length > fullText.length) {
                  fullText = fetchedFull;
                }
              }

              console.log(
                `[Monitor] Sending post ${match.tweetId} to Groq LLM (qwen/qwen3.8-27b) for classification...`
              );
              const classification = await classifyContributionText(
                fullText,
                match.authorHandle
              );

              isRelevant = classification.isRelevant;
              console.log(
                `[Monitor] [LLM RESULT] Post ${match.tweetId} Relevance: ${isRelevant ? "TRUE (Confirmed Topic)" : "FALSE (Rejected)"} | Raw: "${classification.rawResponse}"`
              );

              if (isRelevant) {
                summary.confirmedByLlm++;
              } else {
                summary.rejectedByLlm++;
              }

              // Persist initial evaluation into Supabase
              await recordNewContribution({
                tweet_id: match.tweetId,
                tweet_url: match.tweetUrl,
                user_handle: match.authorHandle,
                did: user.did,
                profile_id: user.id,
                content: fullText,
                tweet_type: match.tweetType,
                posted_at: match.postedAt,
                status: isRelevant ? "detected" : "ignored",
                is_relevant: isRelevant,
                llm_model: classification.model,
                llm_response: classification.rawResponse,
                llm_evaluated_at: new Date().toISOString(),
              });

              summary.newMatchesRecorded++;
            }

            // Step 3: If LLM confirmed TRUE -> Check Daily Contribution Limit (Spam Control)
            if (isRelevant) {
              const postCalendarDate = (match.postedAt || new Date().toISOString()).split("T")[0];
              const alreadyContributedToday = await hasUserContributedOnDate(
                match.authorHandle,
                postCalendarDate,
                match.tweetId
              );

              if (alreadyContributedToday) {
                // DAILY LIMIT REACHED: Reject the second/duplicate contribution on same day
                console.log(
                  `[Monitor] [DAILY LIMIT REACHED] User @${match.authorHandle} already contributed on ${postCalendarDate}. Rejecting post ${match.tweetId} (Spam control).`
                );

                console.log(
                  `[Monitor] Dispatching Agent reply with REJECTED banner to tweet ${match.tweetId}...`
                );
                const replyRes = await replyToTweetWithBannerOnly(match.tweetId, "rejected");

                if (replyRes.success && replyRes.replyTweetId) {
                  console.log(
                    `[Monitor] [REPLY SENT] Agent replied with REJECTED banner. Reply ID: ${replyRes.replyTweetId}`
                  );
                  summary.repliesRejectedSent++;

                  await updateContributionReplyStatus(match.tweetId, {
                    status: "rejected",
                    rejection_reason: "Spam control: 1 contribution allowed per calendar day",
                    is_relevant: true,
                    reply_tweet_id: replyRes.replyTweetId,
                    reply_media_id: replyRes.mediaId,
                    reply_at: new Date().toISOString(),
                  });
                } else {
                  console.warn(`[Monitor] Agent rejection reply failed for tweet ${match.tweetId}:`, replyRes.error);
                  summary.errors.push(`Rejection reply failed for tweet ${match.tweetId}: ${replyRes.error}`);
                }
              } else {
                // FIRST CONTRIBUTION OF THE DAY: Accept and record
                console.log(
                  `[Monitor] [ACCEPTED CONTRIBUTION] User @${match.authorHandle} on ${postCalendarDate}. Dispatching RECORDED banner...`
                );
                const replyRes = await replyToTweetWithBannerOnly(match.tweetId, "recorded");

                if (replyRes.success && replyRes.replyTweetId) {
                  console.log(
                    `[Monitor] [REPLY SENT] Agent replied with RECORDED banner. Reply ID: ${replyRes.replyTweetId}`
                  );
                  summary.repliesRecordedSent++;

                  await updateContributionReplyStatus(match.tweetId, {
                    status: "replied",
                    is_relevant: true,
                    reply_tweet_id: replyRes.replyTweetId,
                    reply_media_id: replyRes.mediaId,
                    reply_at: new Date().toISOString(),
                  });
                } else {
                  console.warn(
                    `[Monitor] Agent recorded reply failed for tweet ${match.tweetId}:`,
                    replyRes.error
                  );
                  await updateContributionReplyStatus(match.tweetId, {
                    status: "failed",
                    is_relevant: true,
                    error_message: replyRes.error || "Failed to post reply",
                  });
                  summary.errors.push(
                    `Recorded reply failed for tweet ${match.tweetId}: ${replyRes.error}`
                  );
                }
              }
            }
          } catch (tweetErr: any) {
            console.error(
              `[Monitor] Error processing tweet match ${match.tweetId}:`,
              tweetErr.message
            );
            summary.errors.push(
              `Error processing tweet ${match.tweetId}: ${tweetErr.message}`
            );
          }
        }
      } catch (userErr: any) {
        console.error(
          `[Monitor] Error scanning user @${user.x_handle}:`,
          userErr.message
        );
        summary.errors.push(
          `Error scanning @${user.x_handle}: ${userErr.message}`
        );
      }
    }
  } catch (cycleErr: any) {
    console.error("[Monitor] Cycle fatal error:", cycleErr.message);
    summary.errors.push(`Cycle fatal error: ${cycleErr.message}`);
  }

  console.log(
    `[Monitor] Cycle complete. Checked: ${summary.registeredUsersChecked}, Found: ${summary.totalMatchesFound}, Confirmed: ${summary.confirmedByLlm}, Rejected: ${summary.rejectedByLlm}, Replied Recorded: ${summary.repliesRecordedSent}, Replied Rejected: ${summary.repliesRejectedSent}`
  );

  return summary;
}
