/**
 * YouTube Music answers the extension's search requests only with its own origin. The rule
 * covers requests from the extension's worker alone (tab -1), never pages the user browses.
 */
export async function registerYouTubeHeaders(): Promise<void> {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            { header: "origin", operation: "set", value: "https://music.youtube.com" },
            { header: "referer", operation: "set", value: "https://music.youtube.com/" }
          ]
        },
        condition: {
          requestDomains: ["music.youtube.com", "www.youtube.com"],
          tabIds: [-1],
          resourceTypes: ["xmlhttprequest", "other"]
        }
      }
    ]
  })
}
