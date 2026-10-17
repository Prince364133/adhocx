import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Supported language item descriptor
class AppLanguageItem {
  final String code;
  final String nativeName;
  final String englishName;

  const AppLanguageItem({
    required this.code,
    required this.nativeName,
    required this.englishName,
  });
}

/// Comprehensive, production-grade Translation & Language Service.
class AppLanguageService {
  AppLanguageService._();
  static final AppLanguageService instance = AppLanguageService._();

  static const List<AppLanguageItem> supportedLanguages = [
    AppLanguageItem(code: 'en', nativeName: 'English', englishName: 'English'),
    AppLanguageItem(code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi'),
    AppLanguageItem(code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu'),
  ];

  static const Map<String, Map<String, String>> _translations = {
    // ── English (en) ─────────────────────────────────────────────────────────
    'en': {
      // Profile & Settings
      'Driver Profile & Settings': 'Driver Profile & Settings',
      'Manage account, fleet & preferences': 'Manage account, fleet & preferences',
      'Personal Information': 'Personal Information',
      'Name, contact & profile details': 'Name, contact & profile details',
      'Vehicle Details': 'Vehicle Details',
      'Car model, plate & specifications': 'Car model, plate & specifications',
      'KYC & Verification': 'KYC & Verification',
      'Driving license, RC & Aadhaar card': 'Driving license, RC & Aadhaar card',
      'Account Status & Tier': 'Account Status & Tier',
      'Active Driver': 'Active Driver',
      'Gold Level': 'Gold Level',
      'Gold Tier': 'Gold Tier',
      'Driver Rate Card': 'Driver Rate Card',
      'Standard base fare & distance rates': 'Standard base fare & distance rates',
      'Notifications Feed': 'Notifications Feed',
      'Dispatch updates & payment alerts': 'Dispatch updates & payment alerts',
      'App Language': 'App Language',
      'Select your preferred dialect': 'Select your preferred dialect',
      'Select Language': 'Select Language',
      'App Theme': 'App Theme',
      'Light, dark, or system default': 'Light, dark, or system default',
      'Help & 24/7 Support': 'Help & 24/7 Support',
      'How can we help you?': 'How can we help you?',
      "We're here to support you 24/7": "We're here to support you 24/7",
      'Help Center': 'Help Center',
      'FAQs and guides': 'FAQs and guides',
      'Contact Support': 'Contact Support',
      'Call Support': 'Call Support',
      'Report an Issue': 'Report an Issue',
      'Something not working?': 'Something not working?',
      'Frequently Asked Questions': 'Frequently Asked Questions',
      'Search FAQs': 'Search FAQs',
      'Driver helpline & incident support': 'Driver helpline & incident support',
      'Delete Account': 'Delete Account',
      'Permanently remove account & all data': 'Permanently remove account & all data',
      'Sign Out': 'Sign Out',
      'Cancel': 'Cancel',
      'Delete Forever': 'Delete Forever',
      'Are you sure you want to sign out of your AdhocX driver account?': 'Are you sure you want to sign out of your AdhocX driver account?',
      'Are you sure you want to delete your driver account?': 'Are you sure you want to delete your driver account? This action is permanent and cannot be undone.',

      // Account Status & Metrics
      'Account Status': 'Account Status',
      'Your account is active and in good standing': 'Your account is active and in good standing',
      'Your account verification is': 'Your account verification is',
      'Under Review': 'Under Review',
      'Pending Verification': 'Pending Verification',
      'Verification Status': 'Verification Status',
      'VERIFIED': 'VERIFIED',
      'Verified': 'Verified',
      'PENDING': 'PENDING',
      'Pending': 'Pending',
      'In Review': 'In Review',
      'UNDER_REVIEW': 'UNDER REVIEW',
      'Account Created': 'Account Created',
      'Total Trips Completed': 'Total Trips Completed',
      'Customer Rating': 'Customer Rating',
      'View Account Policies': 'View Account Policies',
      'Rating': 'Rating',
      'Trips': 'Trips',
      'Acceptance': 'Acceptance',

      // Personal Details
      'Personal Details': 'Personal Details',
      'Full Name': 'Full Name',
      'Date of Birth': 'Date of Birth',
      'Gender': 'Gender',
      'Address': 'Address',
      'Emergency Contact': 'Emergency Contact',
      'Edit': 'Edit',
      'Driver ID': 'Driver ID',
      'Not provided': 'Not provided',
      'Not specified': 'Not specified',
      'Male': 'Male',
      'Female': 'Female',
      'Other': 'Other',
      'Take Photo with Camera': 'Take Photo with Camera',
      'Take a Photo': 'Take a Photo',
      'Choose from Gallery': 'Choose from Gallery',
      'Upload Profile Photo': 'Upload Profile Photo',
      'Profile photo uploaded successfully!': 'Profile photo uploaded successfully!',

      // Bottom Navigation & Core Tabs
      'Home': 'Home',
      'Opportunities': 'Opportunities',
      'Earnings': 'Earnings',
      'Profile': 'Profile',

      // User / Booker Side
      'Active Requirements': 'Active Requirements',
      'Total Requirements': 'Total Requirements',
      'Assigned': 'Assigned',
      'Searching': 'Searching',
      'Completed': 'Completed',
      'All Requirements': 'All Requirements',
      'Wallet & Payments': 'Wallet & Payments',
      'App Settings': 'App Settings',
      'Help & Support': 'Help & Support',
      'Good morning,': 'Good morning,',
      'Good afternoon,': 'Good afternoon,',
      'Good evening,': 'Good evening,',
      '+ Post New Requirement': '+ Post New Requirement',
      'Settings': 'Settings',
      'About': 'About',
      'App Version': 'App Version',
      'Privacy Policy': 'Privacy Policy',
      'Terms & Conditions': 'Terms & Conditions',
      'Booker / Corporate Fleet Account': 'Booker / Corporate Fleet Account',
      'ESCORT': 'ESCORT',
      'Escort Required': 'Escort Required',
      'Security Escort Guard Assigned': 'Security Escort Guard Assigned',
      'Security Escort Required: An escort guard will accompany this trip.': 'Security Escort Required: An escort guard will accompany this trip.',
      'Guaranteed Fare • Escort Included': 'Guaranteed Fare • Escort Included',
    },

    // ── Hindi (hi) ───────────────────────────────────────────────────────────
    'hi': {
      // Profile & Settings
      'Driver Profile & Settings': 'चालक प्रोफ़ाइल और सेटिंग्स',
      'Manage account, fleet & preferences': 'खाता, वाहन और प्राथमिकताएं प्रबंधित करें',
      'Personal Information': 'व्यक्तिगत जानकारी',
      'Name, contact & profile details': 'नाम, संपर्क और प्रोफ़ाइल विवरण',
      'Vehicle Details': 'वाहन विवरण',
      'Car model, plate & specifications': 'कार मॉडल, नंबर प्लेट और विवरण',
      'KYC & Verification': 'केवाईसी और सत्यापन',
      'Driving license, RC & Aadhaar card': 'ड्राइविंग लाइसेंस, आरसी और आधार कार्ड',
      'Account Status & Tier': 'खाता स्थिति और स्तर',
      'Active Driver': 'सक्रिय चालक',
      'Gold Level': 'गोल्ड स्तर',
      'Gold Tier': 'गोल्ड टियर',
      'Driver Rate Card': 'चालक दर सूची',
      'Standard base fare & distance rates': 'मानक आधार किराया और दूरी दरें',
      'Notifications Feed': 'सूचनाएं',
      'Dispatch updates & payment alerts': 'डिस्पैच अपडेट और भुगतान अलर्ट',
      'App Language': 'ऐप की भाषा',
      'Select your preferred dialect': 'अपनी पसंदीदा भाषा चुनें',
      'Select Language': 'भाषा चुनें',
      'App Theme': 'ऐप थीम',
      'Light, dark, or system default': 'लाइट, डार्क या सिस्टम डिफॉल्ट',
      'Help & 24/7 Support': 'सहायता और 24/7 सपोर्ट',
      'How can we help you?': 'हम आपकी किस प्रकार सहायता कर सकते हैं?',
      "We're here to support you 24/7": 'हम आपकी 24/7 सहायता के लिए यहां हैं',
      'Help Center': 'सहायता केंद्र',
      'FAQs and guides': 'अक्सर पूछे जाने वाले प्रश्न और गाइड',
      'Contact Support': 'सपोर्ट से संपर्क करें',
      'Call Support': 'सपोर्ट को कॉल करें',
      'Report an Issue': 'समस्या की रिपोर्ट करें',
      'Something not working?': 'कुछ ठीक से काम नहीं कर रहा?',
      'Frequently Asked Questions': 'अक्सर पूछे जाने वाले प्रश्न (FAQ)',
      'Search FAQs': 'प्रश्नों में खोजें',
      'Driver helpline & incident support': 'चालक हेल्पलाइन और आपातकालीन सहायता',
      'Delete Account': 'खाता हटाएं',
      'Permanently remove account & all data': 'खाता और सारा डेटा स्थायी रूप से हटाएं',
      'Sign Out': 'साइन आउट',
      'Cancel': 'रद्द करें',
      'Delete Forever': 'हमेशा के लिए हटाएं',
      'Are you sure you want to sign out of your AdhocX driver account?': 'क्या आप वाकई अपने AdhocX चालक खाते से साइन आउट करना चाहते हैं?',
      'Are you sure you want to delete your driver account?': 'क्या आप वाकई अपना चालक खाता हटाना चाहते हैं? यह कार्रवाई स्थायी है और इसे वापस नहीं लिया जा सकता।',

      // Account Status & Metrics
      'Account Status': 'खाता स्थिति',
      'Your account is active and in good standing': 'आपका खाता सक्रिय है और अच्छी स्थिति में है',
      'Your account verification is': 'आपके खाते का सत्यापन है',
      'Under Review': 'समीक्षाधीन',
      'Pending Verification': 'सत्यापन लंबित',
      'Verification Status': 'सत्यापन स्थिति',
      'VERIFIED': 'सत्यापित',
      'Verified': 'सत्यापित',
      'PENDING': 'लंबित',
      'Pending': 'लंबित',
      'In Review': 'समीक्षा में',
      'UNDER_REVIEW': 'समीक्षाधीन',
      'Account Created': 'खाता बनाया गया',
      'Total Trips Completed': 'कुल पूरी की गई यात्राएं',
      'Customer Rating': 'ग्राहक रेटिंग',
      'View Account Policies': 'खाता नीतियां देखें',
      'Rating': 'रेटिंग',
      'Trips': 'यात्राएं',
      'Acceptance': 'स्वीकृति',

      // Personal Details
      'Personal Details': 'व्यक्तिगत विवरण',
      'Full Name': 'पूरा नाम',
      'Date of Birth': 'जन्म तिथि',
      'Gender': 'लिंग',
      'Address': 'पता',
      'Emergency Contact': 'आपातकालीन संपर्क',
      'Edit': 'संपादित करें',
      'Driver ID': 'चालक आईडी',
      'Not provided': 'प्रदान नहीं किया गया',
      'Not specified': 'निर्दिष्ट नहीं है',
      'Male': 'पुरुष',
      'Female': 'महिला',
      'Other': 'अन्य',
      'Take Photo with Camera': 'कैमरे से फोटो लें',
      'Take a Photo': 'फोटो खींचें',
      'Choose from Gallery': 'गैलरी से चुनें',
      'Upload Profile Photo': 'प्रोफ़ाइल फोटो अपलोड करें',
      'Profile photo uploaded successfully!': 'प्रोफ़ाइल फोटो सफलतापूर्वक अपलोड हो गई!',

      // Bottom Navigation & Core Tabs
      'Home': 'होम',
      'Opportunities': 'अवसर',
      'Earnings': 'कमाई',
      'Profile': 'प्रोफ़ाइल',

      // User / Booker Side
      'Active Requirements': 'सक्रिय आवश्यकताएं',
      'Total Requirements': 'कुल आवश्यकताएं',
      'Assigned': 'सौंपा गया',
      'Searching': 'खोज जारी',
      'Completed': 'पूर्ण',
      'All Requirements': 'सभी आवश्यकताएं',
      'Wallet & Payments': 'वॉलेट और भुगतान',
      'App Settings': 'ऐप सेटिंग्स',
      'Help & Support': 'सहायता और सपोर्ट',
      'Good morning,': 'शुभ प्रभात,',
      'Good afternoon,': 'शुभ दोपहर,',
      'Good evening,': 'शुभ संध्या,',
      '+ Post New Requirement': '+ नई आवश्यकता पोस्ट करें',
      'Settings': 'सेटिंग्स',
      'About': 'के बारे में',
      'App Version': 'ऐप संस्करण',
      'Privacy Policy': 'गोपनीयता नीति',
      'Terms & Conditions': 'नियम और शर्तें',
      'Booker / Corporate Fleet Account': 'बुकर / कॉर्पोरेट बेड़ा खाता',
      'ESCORT': 'एस्कॉर्ट',
      'Escort Required': 'एस्कॉर्ट आवश्यक',
      'Security Escort Guard Assigned': 'सुरक्षा एस्कॉर्ट गार्ड सौंपा गया',
      'Security Escort Required: An escort guard will accompany this trip.': 'सुरक्षा एस्कॉर्ट आवश्यक: इस यात्रा में एक एस्कॉर्ट गार्ड साथ रहेगा।',
      'Guaranteed Fare • Escort Included': 'गारंटीकृत किराया • एस्कॉर्ट शामिल',
    },

    // ── Telugu (te) ──────────────────────────────────────────────────────────
    'te': {
      // Profile & Settings
      'Driver Profile & Settings': 'డ్రైవర్ ప్రొఫైల్ & సెట్టింగ్‌లు',
      'Manage account, fleet & preferences': 'ఖాతా, వాహనం & ప్రాధాన్యతలను నిర్వహించండి',
      'Personal Information': 'వ్యక్తిగత సమాచారం',
      'Name, contact & profile details': 'పేరు, సంప్రదింపు & ప్రొఫైల్ వివరాలు',
      'Vehicle Details': 'వాహన వివరాలు',
      'Car model, plate & specifications': 'కార్ మోడల్, నంబర్ ప్లేట్ & వివరాలు',
      'KYC & Verification': 'కేవైసీ & ధృవీకరణ',
      'Driving license, RC & Aadhaar card': 'డ్రైవింగ్ లైసెన్స్, ఆర్సీ & ఆధార్ కార్డ్',
      'Account Status & Tier': 'ఖాతా స్థితి & స్థాయి',
      'Active Driver': 'యాక్టివ్ డ్రైవర్',
      'Gold Level': 'గోల్డ్ స్థాయి',
      'Gold Tier': 'గోల్డ్ టైర్',
      'Driver Rate Card': 'డ్రైవర్ రేట్ కార్డ్',
      'Standard base fare & distance rates': 'ప్రామాణిక ప్రాథమిక ఛార్జీ & దూరపు రేట్లు',
      'Notifications Feed': 'నోటిఫికేషన్లు',
      'Dispatch updates & payment alerts': 'డిస్పాచ్ అప్‌డేట్‌లు & చెల్లింపు హెచ్చరికలు',
      'App Language': 'యాప్ భాష',
      'Select your preferred dialect': 'మీకు ఇష్టమైన భాషను ఎంచుకోండి',
      'Select Language': 'భాషను ఎంచుకోండి',
      'App Theme': 'యాప్ థీమ్',
      'Light, dark, or system default': 'లైట్, డార్క్ లేదా సిస్టమ్ డిఫాల్ట్',
      'Help & 24/7 Support': 'సహాయం & 24/7 మద్దతు',
      'How can we help you?': 'మేము మీకు ఎలా సహాయపడగలము?',
      "We're here to support you 24/7": 'మేము 24/7 మీకు సహాయం చేయడానికి ఇక్కడ ఉన్నాము',
      'Help Center': 'సహాయ కేంద్రం',
      'FAQs and guides': 'తరచుగా అడిగే ప్రశ్నలు & గైడ్‌లు',
      'Contact Support': 'మద్దతును సంప్రదించండి',
      'Call Support': 'మద్దతుకు కాల్ చేయండి',
      'Report an Issue': 'సమస్యను నివేదించండి',
      'Something not working?': 'ఏదైనా పని చేయడం లేదా?',
      'Frequently Asked Questions': 'తరచుగా అడిగే ప్రశ్నలు (FAQ)',
      'Search FAQs': 'ప్రశ్నలలో వెతకండి',
      'Driver helpline & incident support': 'డ్రైవర్ హెల్ప్‌లైన్ & అత్యవసర మద్దతు',
      'Delete Account': 'ఖాతాను తొలగించండి',
      'Permanently remove account & all data': 'ఖాతా & మొత్తం డేటాను శాశ్వతంగా తొలగించండి',
      'Sign Out': 'సైన్ అవుట్',
      'Cancel': 'రద్దు చేయండి',
      'Delete Forever': 'శాశ్వతంగా తొలగించు',
      'Are you sure you want to sign out of your AdhocX driver account?': 'మీరు మీ AdhocX డ్రైవర్ ఖాతా నుండి ఖచ్చితంగా సైన్ అవుట్ చేయాలనుకుంటున్నారా?',
      'Are you sure you want to delete your driver account?': 'మీరు మీ డ్రైవర్ ఖాతాను ఖచ్చితంగా తొలగించాలనుకుంటున్నారా? ఈ చర్య శాశ్వతమైనది మరియు రద్దు చేయలేరు.',

      // Account Status & Metrics
      'Account Status': 'ఖాతా స్థితి',
      'Your account is active and in good standing': 'మీ ఖాతా చురుకుగా ఉంది మరియు మంచి స్థితిలో ఉంది',
      'Your account verification is': 'మీ ఖాతా ధృవీకరణ స్థితి',
      'Under Review': 'సమీక్షలో ఉంది',
      'Pending Verification': 'ధృవీకరణ పెండింగ్‌లో ఉంది',
      'Verification Status': 'ధృవీకరణ స్థితి',
      'VERIFIED': 'ధృవీకరించబడింది',
      'Verified': 'ధృవీకరించబడింది',
      'PENDING': 'పెండింగ్‌లో ఉంది',
      'Pending': 'పెండింగ్‌లో ఉంది',
      'In Review': 'సమీక్షలో ఉంది',
      'UNDER_REVIEW': 'సమీక్షలో ఉంది',
      'Account Created': 'ఖాతా సృష్టించబడింది',
      'Total Trips Completed': 'పూర్తి చేసిన మొత్తం ట్రిప్‌లు',
      'Customer Rating': 'కస్టమర్ రేటింగ్',
      'View Account Policies': 'ఖాతా విధానాలను చూడండి',
      'Rating': 'రేటింగ్',
      'Trips': 'ట్రిప్‌లు',
      'Acceptance': 'స్వీకరణ',

      // Personal Details
      'Personal Details': 'వ్యక్తిగత వివరాలు',
      'Full Name': 'పూర్తి పేరు',
      'Date of Birth': 'పుట్టిన తేదీ',
      'Gender': 'లింగం',
      'Address': 'చిరునామా',
      'Emergency Contact': 'అత్యవసర సంప్రదింపు',
      'Edit': 'సవరించండి',
      'Driver ID': 'డ్రైవర్ ఐడి',
      'Not provided': 'అందించబడలేదు',
      'Not specified': 'పేర్కొనబడలేదు',
      'Male': 'పురుషుడు',
      'Female': 'స్త్రీ',
      'Other': 'ఇతర',
      'Take Photo with Camera': 'కెమెరాతో ఫోటో తీయండి',
      'Take a Photo': 'ఫోటో తీయండి',
      'Choose from Gallery': 'గ్యాలరీ నుండి ఎంచుకోండి',
      'Upload Profile Photo': 'ప్రొఫైల్ ఫోటోను అప్‌లోడ్ చేయండి',
      'Profile photo uploaded successfully!': 'ప్రొఫైల్ ఫోటో విజయవంతంగా అప్‌లోడ్ చేయబడింది!',

      // Bottom Navigation & Core Tabs
      'Home': 'హోమ్',
      'Opportunities': 'అవకాశాలు',
      'Earnings': 'ఆదాయం',
      'Profile': 'ప్రొఫైల్',

      // User / Booker Side
      'Active Requirements': 'యాక్టివ్ అవసరాలు',
      'Total Requirements': 'మొత్తం అవసరాలు',
      'Assigned': 'కేటాయించబడింది',
      'Searching': 'శోధిస్తోంది',
      'Completed': 'పూర్తయింది',
      'All Requirements': 'అన్ని అవసరాలు',
      'Wallet & Payments': 'వాలెట్ & చెల్లింపులు',
      'App Settings': 'యాప్ సెట్టింగ్‌లు',
      'Help & Support': 'సహాయం & మద్దతు',
      'Good morning,': 'శుభోదయం,',
      'Good afternoon,': 'శుభ మధ్యాహ్నం,',
      'Good evening,': 'శుభ సాయంత్రం,',
      '+ Post New Requirement': '+ కొత్త అవసరాన్ని పోస్ట్ చేయండి',
      'Settings': 'సెట్టింగ్‌లు',
      'About': 'గురించి',
      'App Version': 'యాప్ వెర్షన్',
      'Privacy Policy': 'గోప్యతా విధానం',
      'Terms & Conditions': 'నిబంధనలు & షరతులు',
      'Booker / Corporate Fleet Account': 'బుకర్ / కార్పొరేట్ ఫ్లీట్ ఖాతా',
      'ESCORT': 'ఎస్కార్ట్',
      'Escort Required': 'ఎస్కార్ట్ అవసరం',
      'Security Escort Guard Assigned': 'సెక్యూరిటీ ఎస్కార్ట్ గార్డ్ కేటాయించబడింది',
      'Security Escort Required: An escort guard will accompany this trip.': 'సెక్యూరిటీ ఎస్కార్ట్ అవసరం: ఈ ప్రయాణంలో ఎస్కార్ట్ గార్డ్ ఉంటారు.',
      'Guaranteed Fare • Escort Included': 'గ్యారెంటీడ్ ఛార్జీ • ఎస్కార్ట్ చేర్చబడింది',
    },
  };

  /// Translate a given key using the active language code.
  static String translate(String key, {String? languageCode}) {
    final lang = languageCode ?? 'en';
    final langMap = _translations[lang];
    if (langMap != null && langMap.containsKey(key)) {
      return langMap[key]!;
    }
    // Fallback to English
    final enMap = _translations['en'];
    if (enMap != null && enMap.containsKey(key)) {
      return enMap[key]!;
    }
    return key;
  }
}

/// Extension on BuildContext for quick and reactive translation in widget tree.
extension TranslationContextExtension on BuildContext {
  String tr(String key) {
    try {
      final langProvider = watch<LanguageProvider>();
      final langCode = langProvider.currentLocale.languageCode;
      return AppLanguageService.translate(key, languageCode: langCode);
    } catch (_) {
      return AppLanguageService.translate(key, languageCode: 'en');
    }
  }
}

/// Extension on String for intuitive fluent translation syntax: 'Profile'.tr(context)
extension StringTranslationExtension on String {
  String tr(BuildContext context) => context.tr(this);
}

/// LanguageProvider with persistence and reactive updates.
class LanguageProvider extends ChangeNotifier {
  Locale _currentLocale = const Locale('en');

  Locale get currentLocale => _currentLocale;

  String get currentLanguageCode => _currentLocale.languageCode;

  String get currentLanguageLabel {
    switch (_currentLocale.languageCode) {
      case 'hi':
        return 'हिन्दी';
      case 'te':
        return 'తెలుగు';
      case 'en':
      default:
        return 'English';
    }
  }

  /// Load saved language from SharedPreferences on startup
  Future<void> loadSavedLanguage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedLang = prefs.getString('app_language') ?? 'en';
      if (['en', 'hi', 'te'].contains(savedLang)) {
        _currentLocale = Locale(savedLang);
      } else {
        _currentLocale = const Locale('en');
      }
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading saved language: $e');
    }
  }

  /// Change language, save to local storage, and trigger reactive rebuild across app
  Future<void> setLanguage(String languageCode) async {
    final cleanCode = languageCode.trim().toLowerCase();
    if (!['en', 'hi', 'te'].contains(cleanCode)) return;

    if (_currentLocale.languageCode == cleanCode) return;

    _currentLocale = Locale(cleanCode);
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('app_language', cleanCode);
    } catch (e) {
      debugPrint('Error saving app language: $e');
    }
  }
}
