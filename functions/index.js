const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const defaultTitle = "Public Tak App - Latest Local News Article And Videos | India (Daily Updates)";
const defaultDescription = "पब्लिक तक (Public Tak) - आपके क्षेत्र की हर छोटी-बड़ी खबर! Watch latest local news videos, read hyper-local articles, and get instant daily updates from across India.";
const defaultImage = "https://www.publictak.app/icon-512.png";
const siteDomain = "https://www.publictak.app";

// Helper for general text escaping
function escapeText(text) {
  if (!text) return "";
  return text.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

exports.app = functions.https.onRequest(async (req, res) => {
  // 1. WWW and HTTPS Redirect
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host === 'publictak.app') {
    return res.redirect(301, `https://www.publictak.app${req.url}`);
  }

  // 2. Performance Headers
  res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
  
  // 3. Robust Parameter Check
  const postId = (req.query.postId || req.query.postid || "").trim();
  const userId = (req.query.userId || req.query.userid || "").trim();
  const videoId = (req.query.videoId || req.query.videoid || "").trim();

  // 4. Load Base Template
  let html = "";
  try {
    const indexPath = path.join(__dirname, "index.html");
    html = fs.readFileSync(indexPath, "utf8");
  } catch (e) {
    html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body><div id="root"></div></body></html>`;
  }

  let title = defaultTitle;
  let description = defaultDescription;
  let image = defaultImage;
  let pageUrl = `${siteDomain}${req.url}`;
  let pageType = "website";

  // 5. Fetch Data from Firestore
  try {
    if (postId) {
      const postDoc = await admin.firestore().collection("posts").doc(postId).get();
      if (postDoc.exists) {
        const postData = postDoc.data();
        title = `${postData.title || 'News'} | Public Tak`;
        const plainText = postData.content ? postData.content.replace(/<[^>]*>?/gm, "").replace(/\s+/g, ' ').trim() : "";
        description = plainText.length > 5 ? plainText.substring(0, 160) + "..." : defaultDescription;
        image = postData.thumbnailUrl || defaultImage;
        pageUrl = `${siteDomain}/?postId=${postId}`;
        pageType = "article";
      }
    } else if (videoId) {
      const videoDoc = await admin.firestore().collection("videos").doc(videoId).get();
      if (videoDoc.exists) {
        const videoData = videoDoc.data();
        title = `${videoData.title || 'Video News'} | Public Tak`;
        description = videoData.description || `Watch this latest news video on Public Tak.`;
        image = videoData.thumbnailUrl || defaultImage;
        pageUrl = `${siteDomain}/?videoId=${videoId}`;
        pageType = "video.other";
      }
    } else if (userId) {
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        title = `${userData.name || 'User'} - Public Tak`;
        description = userData.bio || `View profile and news from ${userData.name} on Public Tak.`;
        image = userData.profilePicUrl || defaultImage;
        pageUrl = `${siteDomain}/?userId=${userId}`;
        pageType = "profile";
      }
    }

    // Ensure Absolute URL for image
    if (image && !image.startsWith('http')) {
        image = `${siteDomain}${image.startsWith('/') ? '' : '/'}${image}`;
    }

    // 6. Generate Meta Tags
    const metaTags = `
    <!-- Primary Meta Tags -->
    <title>${escapeText(title)}</title>
    <meta name="title" content="${escapeText(title)}">
    <meta name="description" content="${escapeText(description)}">
    <link rel="canonical" href="${pageUrl}" />

    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="${pageType}">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:title" content="${escapeText(title)}">
    <meta property="og:description" content="${escapeText(description)}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:secure_url" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:site_name" content="Public Tak">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${pageUrl}">
    <meta name="twitter:title" content="${escapeText(title)}">
    <meta name="twitter:description" content="${escapeText(description)}">
    <meta name="twitter:image" content="${image}">
    `;

    // 7. Inject tags into <head> and remove duplicates
    let finalHtml = html
      .replace(/<title>.*?<\/title>/gi, '')
      .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
      .replace(/<meta\s+property=["']og:.*?["'][^>]*>/gi, '')
      .replace(/<meta\s+name=["']twitter:.*?["'][^>]*>/gi, '')
      .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '')
      .replace("<head>", `<head>${metaTags}`);

    return res.status(200).send(finalHtml);

  } catch (error) {
    console.error("SSR Execution Error:", error);
    return res.status(200).send(html);
  }
});