

export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'کأشُر' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'gom', name: 'Konkani', nativeName: 'कोंकणी' },
  { code: 'sd', name: 'Sindhi', nativeName: 'सिन्धी' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी' },
  { code: 'mni', name: 'Manipuri', nativeName: 'ꯃꯩꯇꯩꯂꯣꯟ' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्' }
];

// Helper to reduce repetition for similar languages or fallbacks
const baseTranslations = {
  home: 'Home', search: 'Search', post: 'Post', alerts: 'Alerts', profile: 'Profile',
  settings: 'Settings', editProfile: 'Edit Profile', myLocation: 'My Location',
  notifications: 'Notifications', nightMode: 'Night Mode', language: 'Language',
  shareApp: 'Share App', rateApp: 'Rate App', feedback: 'Feedback', privacyPolicy: 'Privacy Policy',
  aboutUs: 'About Us', logout: 'Logout', loginSignUp: 'Login / Sign Up', follow: 'Follow',
  following: 'Following', readMore: 'Read more', translate: 'Translate', original: 'See Original',
  translating: 'Translating...', account: 'Account', appSettings: 'App Settings', support: 'Support',
  myPosts: 'My Posts', newPost: 'New Post', views: 'Views', publishedOn: 'Published on',
  report: 'Report', delete: 'Delete', edit: 'Edit', saveChanges: 'Save Changes',
  changePhoto: 'Change Photo', name: 'Name', username: 'Username', bio: 'Bio',
  selectState: 'Select State', selectDistrict: 'Select District', selectBlock: 'Select Block',
  newsFilter: 'News Filter', latest: 'Latest', 'recent news': 'Recent News', politics: 'Politics', crime: 'Crime',
  sports: 'Sports', entertainment: 'Entertainment', business: 'Business', technology: 'Technology',
  health: 'Health', world: 'World', general: 'General',
  loading: 'Loading...', error: 'Error', noPostsFound: 'No posts found.',
  tryAdjusting: 'Try adjusting your filters!', login: 'Login', signup: 'Sign Up',
  fullName: 'Full Name', email: 'Email', password: 'Password', confirmPassword: 'Confirm Password',
  submit: 'Submit', cancel: 'Cancel', uploadImage: 'Upload Image', writeArticle: 'Write Article',
  publish: 'Publish', title: 'Title', thumbnail: 'Thumbnail', searchPlaceholder: 'Search posts and users...',
  noResults: 'No results found', welcome: 'Welcome', createAccount: 'Create Account',
  forgotPassword: 'Forgot Password?', continueWithGoogle: 'Continue with Google',
  dontHaveAccount: "Don't have an account?", alreadyHaveAccount: "Already have an account?",
  uploadFile: 'Upload a file', orDragDrop: 'or drag and drop',
  adminPanel: 'Admin Panel', manageUsers: 'Manage Users', analytics: 'Analytics',
  moderateContent: 'Moderate Content', siteSettings: 'Site Settings',
  accessDenied: 'Access Denied', permissionDenied: 'You do not have permission to access this page.',
  userProfile: 'User Profile', userPosts: 'User Posts', saveProfile: 'Save Profile',
  comment: 'Comment', comments: 'Comments', addComment: 'Add a comment...', posting: 'Posting...',
  nearMe: 'Near Me', pleaseSetLocation: 'Please set your location to view local news.'
};

export const translations: Record<string, Record<string, string>> = {
  en: { ...baseTranslations },
  hi: {
    ...baseTranslations,
    home: 'होम', search: 'खोजें', post: 'पोस्ट', alerts: 'सूचनाएं', profile: 'प्रोफाइल',
    settings: 'सेटिंग्स', editProfile: 'प्रोफाइल एडिट करें', myLocation: 'मेरा स्थान',
    notifications: 'सूचनाएं', nightMode: 'नाइट मोड', language: 'भाषा',
    shareApp: 'ऐप शेयर करें', rateApp: 'ऐप रेट करें', feedback: 'फीडबैक',
    privacyPolicy: 'गोपनीयता नीति', aboutUs: 'हमारे बारे में', logout: 'लॉग आउट',
    loginSignUp: 'लॉगिन / साइन अप', follow: 'फॉलो करें', following: 'फॉलो कर रहे हैं',
    readMore: 'और पढ़ें', translate: 'अनुवाद करें', original: 'मूल देखें',
    translating: 'अनुवाद हो रहा है...', account: 'खाता', appSettings: 'ऐप सेटिंग्स',
    support: 'सहायता', myPosts: 'मेरी पोस्ट', newPost: 'नई पोस्ट',
    views: 'वि्यूज', publishedOn: 'प्रकाशित', report: 'रिपोर्ट', delete: 'हटाएं',
    edit: 'एडिट', saveChanges: 'बदलाव सहेजें', changePhoto: 'फोटो बदलें',
    name: 'नाम', username: 'यूजरनेम', bio: 'बायो',
    selectState: 'राज्य चुनें', selectDistrict: 'जिला चुनें', selectBlock: 'ब्लॉक चुनें',
    newsFilter: 'समाचार फ़िल्टर', latest: 'ताज़ा', 'recent news': 'ताज़ा ख़बरें', politics: 'राजनीति', crime: 'अपराध',
    sports: 'खेल', entertainment: 'मनोरंजन', business: 'व्यापार', technology: 'तकनीक',
    health: 'सेहत', world: 'दुनिया', general: 'अन्य',
    loading: 'लोड हो रहा है...', error: 'त्रुटि', noPostsFound: 'कोई पोस्ट नहीं मिली।',
    tryAdjusting: 'फ़िल्टर बदलने की कोशिश करें!', login: 'लॉगिन', signup: 'साइन अप',
    fullName: 'पूरा नाम', email: 'ईमेल', password: 'पासवर्ड', confirmPassword: 'पासवर्ड की पुष्टि करें',
    submit: 'जमा करें', cancel: 'रद्द करें', uploadImage: 'इमेज अपलोड करें', writeArticle: 'लेख लिखें',
    publish: 'प्रकाशित करें', title: 'शीर्षक', thumbnail: 'थंबनेल', searchPlaceholder: 'पोस्ट और यूजर खोजें...',
    noResults: 'कोई परिणाम नहीं मिला', welcome: 'स्वागत है', createAccount: 'खाता बनाएं',
    forgotPassword: 'पासवर्ड भूल गए?', continueWithGoogle: 'Google के साथ जारी रखें',
    dontHaveAccount: "खाता नहीं है?", alreadyHaveAccount: "पहले से खाता है?",
    uploadFile: 'फाइल अपलोड करें', orDragDrop: 'या ड्रैग एंड ड्रॉप करें',
    adminPanel: 'एडमिन पैनल', manageUsers: 'यूजर प्रबंधित करें', analytics: 'एनालिटिक्स',
    moderateContent: 'कंटेंट मॉडरेट करें', siteSettings: 'साइट सेटिंग्स',
    accessDenied: 'प्रवेश वर्जित', permissionDenied: 'आपको इस पेज को देखने की अनुमति नहीं है।',
    userProfile: 'यूजर प्रोफाइल', userPosts: 'यूजर की पोस्ट', saveProfile: 'प्रोफाइल सहेजें',
    comment: 'टिप्पणी', comments: 'टिप्पणियां', addComment: 'टिप्पणी लिखें...', posting: 'पोस्ट हो रहा है...',
    nearMe: 'मेरे आस-पास', pleaseSetLocation: 'कृपया स्थानीय समाचार देखने के लिए अपना स्थान निर्धारित करें।'
  },
  bn: {
    ...baseTranslations,
    home: 'হোম', search: 'অনুসন্ধান', post: 'পোস্ট', alerts: 'সতর্কতা', profile: 'প্রোফাইল',
    settings: 'সেটিংস', login: 'লগইন', signup: 'সাইন আপ', logout: 'লগ আউট',
    latest: 'সর্বশেষ', 'recent news': 'সাম্প্রতিক খবর', politics: 'রাজনীতি', sports: 'খেলাধুলা', entertainment: 'বিনোদন',
    loading: 'লোডিং...', error: 'ত্রুটি', noPostsFound: 'কোনো পোস্ট পাওয়া যায়নি',
    title: 'শিরোনাম', content: 'বিষয়বস্তু', publish: 'প্রকাশ করুন', cancel: 'বাতিল',
    nearMe: 'আমার কাছাকাছি'
  },
  te: {
    ...baseTranslations,
    home: 'హోమ్', search: 'వెతకండి', post: 'పోస్ట్', alerts: 'హెచ్చరికలు', profile: 'ప్రొఫైల్',
    settings: 'సెట్టింగ్స్', login: 'లాగిన్', signup: 'సైన్ అప్', logout: 'లాగ్ అవుట్',
    latest: 'తాజా', 'recent news': 'తాజా వార్తలు', politics: 'రాజకీయం', sports: 'క్రీడలు', entertainment: 'వినోదం',
    loading: 'లోడ్ అవుతోంది...', error: 'లోపం', noPostsFound: 'పోస్ట్‌లు కనుగొనబడలేదు',
    title: 'శీర్షిక', content: 'కంటెంట్', publish: 'ప్రచురించండి', cancel: 'రద్దు చేయండి',
    nearMe: 'నా దగ్గర'
  },
  mr: {
    ...baseTranslations,
    home: 'होम', search: 'शोधा', post: 'पोस्ट', alerts: 'सूचना', profile: 'प्रोफाइल',
    settings: 'सेटिंग्ज', login: 'लॉगिन', signup: 'साइन अप', logout: 'लॉग आउट',
    latest: 'नवीनतम', 'recent news': 'अलीकडील बातम्या', politics: 'राजकारण', sports: 'क्रीडा', entertainment: 'मनोरंजन',
    loading: 'लोड होत आहे...', error: 'त्रुटी', noPostsFound: 'कोणतीही पोस्ट सापडली नाही',
    title: 'शीर्षक', content: 'मजकूर', publish: 'प्रकाशित करा', cancel: 'रद्द करा',
    nearMe: 'माझ्या जवळ'
  },
  ta: {
    ...baseTranslations,
    home: 'முகப்பு', search: 'தேடல்', post: 'பதிவு', alerts: 'எச்சரிக்கைகள்', profile: 'சுயவிவரம்',
    settings: 'அமைப்புகள்', login: 'உள்நுழைய', signup: 'பதிவு', logout: 'வெளியேறு',
    latest: 'சமீபத்திய', 'recent news': 'சமீபத்திய செய்திகள்', politics: 'அரசியல்', sports: 'விளையாட்டு', entertainment: 'பொழுதுபோக்கு',
    loading: 'ஏற்றுகிறது...', error: 'பிழை', noPostsFound: 'பதிவுகள் எதுவும் இல்லை',
    title: 'தலைப்பு', content: 'உள்ளடக்கம்', publish: 'வெளியிடு', cancel: 'ரத்துசெய்',
    nearMe: 'அருகில்'
  },
  ur: {
    ...baseTranslations,
    home: 'ہوم', search: 'تلاش', post: 'پوسٹ', alerts: 'اطلاعات', profile: 'پروفائل',
    settings: 'ترتیبات', login: 'لاگ ان', signup: 'سائن اپ', logout: 'لاگ آؤٹ',
    latest: 'تازہ ترین', 'recent news': 'تازہ ترین خبریں', politics: 'سیاست', sports: 'کھیل', entertainment: 'تفریح',
    loading: 'لوڈ ہو رہا ہے...', error: 'غلطی', noPostsFound: 'کوئی پوسٹ نہیں ملی',
    title: 'عنوان', content: 'مواد', publish: 'شائع کریں', cancel: 'منسوخ کریں',
    nearMe: 'میرے قریب'
  },
  gu: {
    ...baseTranslations,
    home: 'હોમ', search: 'શોધ', post: 'પોસ્ટ', alerts: 'સૂચનાઓ', profile: 'પ્રોફાઇલ',
    settings: 'સેટિંગ્સ', login: 'લૉગિન', signup: 'સાઇન અપ', logout: 'લૉગ આઉટ',
    latest: 'તાજેતરના', 'recent news': 'તાજેતરના સમાચાર', politics: 'રાજકારણ', sports: 'રમતગમત', entertainment: 'મનોરંજન',
    loading: 'લોડ થઈ રહ્યું છે...', error: 'ભૂલ', noPostsFound: 'કોઈ પોસ્ટ મળી નથી',
    title: 'શીર્ષક', content: 'સામગ્રી', publish: 'પ્રકાશિત કરો', cancel: 'રદ કરો',
    nearMe: 'મારી નજીક'
  },
  kn: {
    ...baseTranslations,
    home: 'ಮನೆ', search: 'ಹುಡುಕಿ', post: 'ಪೋಸ್ಟ್', alerts: 'ಎಚ್ಚರಿಕೆಗಳು', profile: 'ಪ್ರೊಫೈಲ್',
    settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು', login: 'ಲಾಗಿನ್', signup: 'ಸೈನ್ ಅಪ್', logout: 'ಲಾಗ್ ಔಟ್',
    latest: 'ಇತ್ತೀಚಿನ', 'recent news': 'ಇತ್ತೀಚಿನ ಸುದ್ದಿಗಳು', politics: 'ರಾಜಕೀಯ', sports: 'ಕ್ರೀಡೆ', entertainment: 'ಮನರಂಜನೆ',
    loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...', error: 'ದೋಷ', noPostsFound: 'ಯಾವುದೇ ಪೋಸ್ಟ್‌ಗಳು ಕಂಡುಬಂದಿಲ್ಲ',
    title: 'ಶೀರ್ಷಿಕೆ', content: 'ವಿಷಯ', publish: 'ಪ್ರಕಟಿಸಿ', cancel: 'ರದ್ದುಗೊಳಿಸಿ',
    nearMe: 'ನನ್ನ ಹತ್ತಿರ'
  },
  ml: {
    ...baseTranslations,
    home: 'ഹോം', search: 'തിരയുക', post: 'പോസ്റ്റ്', alerts: 'അറിയിപ്പുകൾ', profile: 'പ്രൊഫൈൽ',
    settings: 'ക്രമീകരണങ്ങൾ', login: 'ലോഗിൻ', signup: 'സൈൻ അപ്പ്', logout: 'ലോഗ് ഔട്ട്',
    latest: 'ഏറ്റവും പുതിയത്', 'recent news': 'സമീപകാല വാർത്തകൾ', politics: 'രാഷ്ട്രീയം', sports: 'കായികം', entertainment: 'വിനോദം',
    loading: 'ലോഡുചെയ്യുന്നു...', error: 'പിശക്', noPostsFound: 'പോസ്റ്റുകളൊന്നും കണ്ടെത്തിയില്ല',
    title: 'തലക്കെട്ട്', content: 'ഉള്ളടക്കം', publish: 'പ്രസിദ്ധീകരിക്കുക', cancel: 'റദ്ദാക്കുക',
    nearMe: 'എന്റെ അടുത്ത്'
  },
  pa: {
    ...baseTranslations,
    home: 'ਘਰ', search: 'ਖੋਜ', post: 'ਪੋਸਟ', alerts: 'ਅਲਰਟ', profile: 'ਪ੍ਰੋਫਾਈਲ',
    settings: 'ਸੈਟਿੰਗਾਂ', login: 'ਲੌਗ ਇਨ', signup: 'ਸਾਈਨ ਅਪ', logout: 'ਲੌਗ ਆਉਟ',
    latest: 'ਨਵੀਨਤਮ', 'recent news': 'ਤਾਜ਼ਾ ਖਬਰਾਂ', politics: 'ਰਾਜਨੀਤੀ', sports: 'ਖੇਡਾਂ', entertainment: 'ਮਨੋਰੰਜਨ',
    loading: 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...', error: 'ਗਲਤੀ', noPostsFound: 'ਕੋਈ ਪੋਸਟ ਨਹੀਂ ਮਿਲੀ',
    title: 'ਸਿਰਲੇਖ', content: 'ਸਮੱਗਰੀ', publish: 'ਪ੍ਰਕਾਸ਼ਿਤ ਕਰੋ', cancel: 'ਰੱਦ ਕਰੋ',
    nearMe: 'ਮੇਰੇ ਨੇੜੇ'
  }
};

export const getTranslation = (lang: string, key: string): string => {
  const langSet = translations[lang] || translations['en'];
  return langSet[key] || translations['en'][key] || key;
};
