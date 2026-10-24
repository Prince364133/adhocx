import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
export 'package:provider/provider.dart';
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
      'Good night,': 'Good night,',
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

      // Sections & Headers
      'ACCOUNT & DOCUMENTS': 'ACCOUNT & DOCUMENTS',
      'EARNINGS & RATES': 'EARNINGS & RATES',
      'PREFERENCES & SYSTEM': 'PREFERENCES & SYSTEM',
      'SUPPORT & SECURITY': 'SUPPORT & SECURITY',
      'SUPPORT & LEGAL': 'SUPPORT & LEGAL',
      'Account & Documents': 'Account & Documents',
      'Earnings & Rates': 'Earnings & Rates',
      'Preferences & System': 'Preferences & System',
      'Support & Security': 'Support & Security',
      'Support & Legal': 'Support & Legal',

      // Role & Vehicle
      'Partner': 'Partner',
      'Driver': 'Driver',
      'Verified Commercial Fleet': 'Verified Commercial Fleet',
      'Commercial Fleet Vehicle': 'Commercial Fleet Vehicle',
      'Active Driver • Gold Level': 'Active Driver • Gold Level',
      'AdhocX Driver • Enterprise Edition': 'AdhocX Driver • Enterprise Edition',

      // Theme
      'Toggle Theme': 'Toggle Theme',
      'Choose Appearance': 'Choose Appearance',
      'Select your preferred visual style': 'Select your preferred visual style',
      'System Default': 'System Default',
      'Syncs automatically with your device settings': 'Syncs automatically with your device settings',
      'Light Mode': 'Light Mode',
      'Crisp white & clean enterprise theme': 'Crisp white & clean enterprise theme',
      'Dark Mode': 'Dark Mode',
      'Sleek operational night-friendly theme': 'Sleek operational night-friendly theme',
      'Light': 'Light',
      'Dark': 'Dark',
      'System default': 'System default',

      // Navigation & Tabs
      'Upcoming': 'Upcoming',
      'Active': 'Active',

      // Home Screen
      'Welcome back,': 'Welcome back,',
      'Trust Score': 'Trust Score',
      'Availability': 'Availability',
      'Offline': 'Offline',
      'Available': 'Available',
      'Online': 'Online',
      'GO ONLINE': 'GO ONLINE',
      'GO OFFLINE': 'GO OFFLINE',
      'Go Online': 'Go Online',
      'Go Offline': 'Go Offline',
      'You are offline': 'You are offline',
      'You are currently offline. Go online to receive trip offers.': 'You are currently offline. Go online to receive trip offers.',
      'Go online to receive trip opportunities in real-time': 'Go online to receive trip opportunities in real-time',
      'Go online to get live trip dispatches': 'Go online to get live trip dispatches',
      "We'll notify you automatically on new requests": "We'll notify you automatically on new requests",
      'You can go offline anytime with one tap': 'You can go offline anytime with one tap',
      "You're available": "You're available",
      'Auto-scanning for incoming booking requests...': 'Auto-scanning for incoming booking requests...',
      'You are online and listening for live nearby trips': 'You are online and listening for live nearby trips',
      "Today's Activity": "Today's Activity",
      'Live Dispatch Offer Available': 'Live Dispatch Offer Available',
      'Tap to view route & accept guaranteed fare • Escort included': 'Tap to view route & accept guaranteed fare • Escort included',
      'View All Live Opportunities': 'View All Live Opportunities',
      'Quick Insights': 'Quick Insights',
      "Today's Earnings": "Today's Earnings",
      'Trips Completed': 'Trips Completed',
      'Guaranteed Fast Payouts': 'Guaranteed Fast Payouts',
      'Direct bank settlement for every trip completed.': 'Direct bank settlement for every trip completed.',
      'Sync Live Offers': 'Sync Live Offers',
      'Trip Successfully Completed!': 'Trip Successfully Completed!',
      'Earnings credited directly to your AdhocX Driver Wallet.': 'Earnings credited directly to your AdhocX Driver Wallet.',
      'Rate Passenger ⭐': 'Rate Passenger ⭐',
      'LOOK FOR NEXT TRIP →': 'LOOK FOR NEXT TRIP →',

      // Opportunities Screen
      'Nearby trips': 'Nearby trips',
      'View all': 'View all',
      'Instant Dispatch': 'Instant Dispatch',
      'Bidding': 'Bidding',
      'Accept': 'Accept',
      'Place Bid': 'Place Bid',
      'No opportunities right now': 'No opportunities right now',
      'Swipe down to refresh or check back soon': 'Swipe down to refresh or check back soon',

      // Trips Screen
      'No upcoming trips': 'No upcoming trips',
      'No active trips': 'No active trips',
      'No completed trips': 'No completed trips',
      'Pickup': 'Pickup',
      'Drop': 'Drop',
      'Fare': 'Fare',
      'View Details': 'View Details',
      'Start Trip': 'Start Trip',
      'Complete Trip': 'Complete Trip',

      // Wallet / Earnings Screen
      'Wallet & Settlements': 'Wallet & Settlements',
      'Available Balance': 'Available Balance',
      'Bank Account Details': 'Bank Account Details',
      'Withdraw Funds': 'Withdraw Funds',
      'Withdrawal History': 'Withdrawal History',
      'Total Earned': 'Total Earned',
      'Bank Account': 'Bank Account',
      'Account Number': 'Account Number',
      'IFSC Code': 'IFSC Code',
      'Withdraw': 'Withdraw',
      'History': 'History',
      'Recent Transactions': 'Recent Transactions',
      'No transactions yet': 'No transactions yet',
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
      'Good night,': 'शुभ रात्रि,',
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

      // Sections & Headers
      'ACCOUNT & DOCUMENTS': 'खाता और दस्तावेज़',
      'EARNINGS & RATES': 'कमाई और दरें',
      'PREFERENCES & SYSTEM': 'प्राथमिकताएं और सिस्टम',
      'SUPPORT & SECURITY': 'सहायता और सुरक्षा',
      'SUPPORT & LEGAL': 'सहायता और कानूनी',
      'Account & Documents': 'खाता और दस्तावेज़',
      'Earnings & Rates': 'कमाई और दरें',
      'Preferences & System': 'प्राथमिकताएं और सिस्टम',
      'Support & Security': 'सहायता और सुरक्षा',
      'Support & Legal': 'सहायता और कानूनी',

      // Role & Vehicle
      'Partner': 'साझेदार',
      'Driver': 'चालक',
      'Verified Commercial Fleet': 'सत्यापित वाणिज्यिक वाहन',
      'Commercial Fleet Vehicle': 'वाणिज्यिक बेड़ा वाहन',
      'Active Driver • Gold Level': 'सक्रिय चालक • गोल्ड स्तर',
      'AdhocX Driver • Enterprise Edition': 'AdhocX चालक • एंटरप्राइज संस्करण',

      // Theme
      'Toggle Theme': 'थीम बदलें',
      'Choose Appearance': 'दिखावट चुनें',
      'Select your preferred visual style': 'अपनी पसंदीदा विज़ुअल शैली चुनें',
      'System Default': 'सिस्टम डिफ़ॉल्ट',
      'Syncs automatically with your device settings': 'आपके डिवाइस सेटिंग्स के साथ स्वचालित रूप से सिंक होता है',
      'Light Mode': 'लाइट मोड',
      'Crisp white & clean enterprise theme': 'स्वच्छ और स्पष्ट एंटरप्राइज थीम',
      'Dark Mode': 'डार्क मोड',
      'Sleek operational night-friendly theme': 'आंखों के अनुकूल स्लीक नाइट थीम',
      'Light': 'लाइट',
      'Dark': 'डार्क',
      'System default': 'सिस्टम डिफ़ॉल्ट',

      // Navigation & Tabs
      'Upcoming': 'आगामी',
      'Active': 'सक्रिय',

      // Home Screen
      'Welcome back,': 'वापसी पर स्वागत है,',
      'Trust Score': 'विश्वास स्कोर',
      'Availability': 'उपलब्धता',
      'Offline': 'ऑफ़लाइन',
      'Available': 'उपलब्ध',
      'Online': 'ऑनलाइन',
      'GO ONLINE': 'ऑनलाइन जाएं',
      'GO OFFLINE': 'ऑफ़लाइन जाएं',
      'Go Online': 'ऑनलाइन जाएं',
      'Go Offline': 'ऑफ़लाइन जाएं',
      'You are offline': 'आप ऑफ़लाइन हैं',
      'You are currently offline. Go online to receive trip offers.': 'आप वर्तमान में ऑफ़लाइन हैं। ट्रिप ऑफ़र पाने के लिए ऑनलाइन जाएं।',
      'Go online to receive trip opportunities in real-time': 'वास्तविक समय में ट्रिप अवसर प्राप्त करने के लिए ऑनलाइन जाएं',
      'Go online to get live trip dispatches': 'लाइव ट्रिप डिस्पैच प्राप्त करने के लिए ऑनलाइन जाएं',
      "We'll notify you automatically on new requests": 'नए अनुरोधों पर हम आपको स्वचालित रूप से सूचित करेंगे',
      'You can go offline anytime with one tap': 'आप एक टैप से कभी भी ऑफ़लाइन जा सकते हैं',
      "You're available": 'आप उपलब्ध हैं',
      'Auto-scanning for incoming booking requests...': 'आने वाले बुकिंग अनुरोधों के लिए ऑटो-स्कैनिंग जारी है...',
      'You are online and listening for live nearby trips': 'आप ऑनलाइन हैं और आस-पास की यात्राओं के लिए तैयार हैं',
      "Today's Activity": 'आज की गतिविधि',
      'Live Dispatch Offer Available': 'लाइव डिस्पैच ऑफ़र उपलब्ध है',
      'Tap to view route & accept guaranteed fare • Escort included': 'मार्ग देखने और गारंटीकृत किराया स्वीकार करने के लिए टैप करें • एस्कॉर्ट शामिल',
      'View All Live Opportunities': 'सभी लाइव अवसर देखें',
      'Quick Insights': 'त्वरित जानकारी',
      "Today's Earnings": 'आज की कमाई',
      'Trips Completed': 'पूरी की गई यात्राएं',
      'Guaranteed Fast Payouts': 'गारंटीकृत त्वरित भुगतान',
      'Direct bank settlement for every trip completed.': 'पूरी की गई हर यात्रा के लिए सीधा बैंक निपटान।',
      'Sync Live Offers': 'लाइव ऑफ़र सिंक करें',
      'Trip Successfully Completed!': 'यात्रा सफलतापूर्वक पूर्ण हुई!',
      'Earnings credited directly to your AdhocX Driver Wallet.': 'कमाई सीधे आपके AdhocX चालक वॉलेट में जमा कर दी गई है।',
      'Rate Passenger ⭐': 'यात्री को रेट करें ⭐',
      'LOOK FOR NEXT TRIP →': 'अगली यात्रा खोजें →',

      // Opportunities Screen
      'Nearby trips': 'आस-पास की यात्राएं',
      'View all': 'सभी देखें',
      'Instant Dispatch': 'त्वरित डिस्पैच',
      'Bidding': 'बोली',
      'Accept': 'स्वीकार करें',
      'Place Bid': 'बोली लगाएं',
      'No opportunities right now': 'फिलहाल कोई अवसर उपलब्ध नहीं है',
      'Swipe down to refresh or check back soon': 'रिफ्रेश करने के लिए नीचे खींचें या जल्द पुनः जांचें',

      // Trips Screen
      'No upcoming trips': 'कोई आगामी यात्रा नहीं है',
      'No active trips': 'कोई सक्रिय यात्रा नहीं है',
      'No completed trips': 'कोई पूर्ण यात्रा नहीं है',
      'Pickup': 'पिकअप',
      'Drop': 'ड्रॉप',
      'Fare': 'किराया',
      'View Details': 'विवरण देखें',
      'Start Trip': 'यात्रा शुरू करें',
      'Complete Trip': 'यात्रा पूरी करें',

      // Wallet / Earnings Screen
      'Wallet & Settlements': 'वॉलेट और निपटान',
      'Available Balance': 'उपलब्ध शेष राशि',
      'Bank Account Details': 'बैंक खाता विवरण',
      'Withdraw Funds': 'पैसे निकालें',
      'Withdrawal History': 'निकासी इतिहास',
      'Total Earned': 'कुल कमाई',
      'Bank Account': 'बैंक खाता',
      'Account Number': 'खाता संख्या',
      'IFSC Code': 'IFSC कोड',
      'Withdraw': 'निकासी करें',
      'History': 'इतिहास',
      'Recent Transactions': 'हाल के लेन-देन',
      'No transactions yet': 'अभी कोई लेन-देन नहीं है',
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
      'Good night,': 'శుభ రాత్రి,',
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

      // Sections & Headers
      'ACCOUNT & DOCUMENTS': 'ఖాతా & పత్రాలు',
      'EARNINGS & RATES': 'ఆదాయం & రేట్లు',
      'PREFERENCES & SYSTEM': 'ప్రాధాన్యతలు & సిస్టమ్',
      'SUPPORT & SECURITY': 'మద్దతు & భద్రత',
      'SUPPORT & LEGAL': 'మద్దతు & చట్టపరమైన',
      'Account & Documents': 'ఖాతా & పత్రాలు',
      'Earnings & Rates': 'ఆదాయం & రేట్లు',
      'Preferences & System': 'ప్రాధాన్యతలు & సిస్టమ్',
      'Support & Security': 'మద్దతు & భద్రత',
      'Support & Legal': 'మద్దతు & చట్టపరమైన',

      // Role & Vehicle
      'Partner': 'భాగస్వామి',
      'Driver': 'డ్రైవర్',
      'Verified Commercial Fleet': 'ధృవీకరించబడిన వాణిజ్య వాహనం',
      'Commercial Fleet Vehicle': 'వాణిజ్య వాహనం',
      'Active Driver • Gold Level': 'యాక్టివ్ డ్రైవర్ • గోల్డ్ స్థాయి',
      'AdhocX Driver • Enterprise Edition': 'AdhocX డ్రైవర్ • ఎంటర్‌ప్రైజ్ ఎడిషన్',

      // Theme
      'Toggle Theme': 'థీమ్ మార్చండి',
      'Choose Appearance': 'రూపాన్ని ఎంచుకోండి',
      'Select your preferred visual style': 'మీకు ఇష్టమైన విజువల్ శైలిని ఎంచుకోండి',
      'System Default': 'సిస్టమ్ డిఫాల్ట్',
      'Syncs automatically with your device settings': 'మీ పరికర సెట్టింగ్‌లతో ఆటోమేటిక్‌గా సింక్ అవుతుంది',
      'Light Mode': 'లైట్ మోడ్',
      'Crisp white & clean enterprise theme': 'స్పష్టమైన తెలుపు & ఎంటర్‌ప్రైజ్ థీమ్',
      'Dark Mode': 'డార్క్ మోడ్',
      'Sleek operational night-friendly theme': 'సొగసైన రాత్రి అనుకూల థీమ్',
      'Light': 'లైట్',
      'Dark': 'డార్క్',
      'System default': 'సిస్టమ్ డిఫాల్ట్',

      // Navigation & Tabs
      'Upcoming': 'రాబోయేవి',
      'Active': 'యాక్టివ్',

      // Home Screen
      'Welcome back,': 'తిరిగి స్వాగతం,',
      'Trust Score': 'విశ్వసనీయత స్కోర్',
      'Availability': 'లభ్యత',
      'Offline': 'ఆఫ్‌లైన్',
      'Available': 'అందుబాటులో ఉన్నారు',
      'Online': 'ఆన్‌లైన్',
      'GO ONLINE': 'ఆన్‌లైన్‌కి వెళ్లండి',
      'GO OFFLINE': 'ఆఫ్‌లైన్‌కి వెళ్లండి',
      'Go Online': 'ఆన్‌లైన్‌కి వెళ్లండి',
      'Go Offline': 'ఆఫ్‌లైన్‌కి వెళ్లండి',
      'You are offline': 'మీరు ఆఫ్‌లైన్‌లో ఉన్నారు',
      'You are currently offline. Go online to receive trip offers.': 'మీరు ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉన్నారు. ట్రిప్ ఆఫర్‌లను స్వీకరించడానికి ఆన్‌లైన్‌కి వెళ్లండి.',
      'Go online to receive trip opportunities in real-time': 'నిజ సమయంలో ట్రిప్ అవకాశాలను పొందడానికి ఆన్‌లైన్‌కి వెళ్లండి',
      'Go online to get live trip dispatches': 'లైవ్ ట్రిప్ డిస్పాచ్‌లను పొందడానికి ఆన్‌లైన్‌కి వెళ్లండి',
      "We'll notify you automatically on new requests": 'కొత్త అభ్యర్థనలపై మేము మీకు ఆటోమేటిక్‌గా తెలియజేస్తాము',
      'You can go offline anytime with one tap': 'ఒక్క ట్యాప్‌తో మీరు ఎప్పుడైనా ఆఫ్‌లైన్‌కి వెళ్లవచ్చు',
      "You're available": 'మీరు అందుబాటులో ఉన్నారు',
      'Auto-scanning for incoming booking requests...': 'ఇన్‌కమింగ్ బుకింగ్ అభ్యర్థనల కోసం ఆటో-స్కానింగ్ జరుగుతోంది...',
      'You are online and listening for live nearby trips': 'మీరు ఆన్‌లైన్‌లో ఉన్నారు మరియు సమీప ట్రిప్పుల కోసం వింటున్నారు',
      "Today's Activity": 'ఈరోజు కార్యకలాపం',
      'Live Dispatch Offer Available': 'లైవ్ డిస్పాచ్ ఆఫర్ అందుబాటులో ఉంది',
      'Tap to view route & accept guaranteed fare • Escort included': 'రూట్‌ను చూడటానికి మరియు హామీతో కూడిన ఛార్జీని అంగీకరించడానికి ట్యాప్ చేయండి • ఎస్కార్ట్ చేర్చబడింది',
      'View All Live Opportunities': 'అన్ని లైవ్ అవకాశాలను చూడండి',
      'Quick Insights': 'త్వరిత వివరాలు',
      "Today's Earnings": 'ఈరోజు ఆదాయం',
      'Trips Completed': 'పూర్తయిన ట్రిప్పులు',
      'Guaranteed Fast Payouts': 'హామీతో కూడిన వేగవంతమైన చెల్లింపులు',
      'Direct bank settlement for every trip completed.': 'పూర్తయిన ప్రతి ట్రిప్‌కు నేరుగా బ్యాంక్ సెటిల్‌మెంట్.',
      'Sync Live Offers': 'లైవ్ ఆఫర్‌లను సింక్ చేయండి',
      'Trip Successfully Completed!': 'ట్రిప్ విజయవంతంగా పూర్తయింది!',
      'Earnings credited directly to your AdhocX Driver Wallet.': 'ఆదాయం నేరుగా మీ AdhocX డ్రైవర్ వాలెట్‌కు జమ చేయబడింది.',
      'Rate Passenger ⭐': 'ప్రయాణీకుడికి రేటింగ్ ఇవ్వండి ⭐',
      'LOOK FOR NEXT TRIP →': 'తదుపరి ట్రిప్ కోసం చూడండి →',

      // Opportunities Screen
      'Nearby trips': 'సమీప ట్రిప్పులు',
      'View all': 'అన్నీ చూడండి',
      'Instant Dispatch': 'తక్షణ డిస్పాచ్',
      'Bidding': 'బిడ్డింగ్',
      'Accept': 'అంగీకరించండి',
      'Place Bid': 'బిడ్ వేయండి',
      'No opportunities right now': 'ప్రస్తుతం ఎలాంటి అవకాశాలు లేవు',
      'Swipe down to refresh or check back soon': 'రిఫ్రెష్ చేయడానికి క్రిందికి లాగండి లేదా కాసేపట్లో మళ్లీ చూడండి',

      // Trips Screen
      'No upcoming trips': 'రాబోయే ట్రిప్పులు ఏవీ లేవు',
      'No active trips': 'యాక్టివ్ ట్రిప్పులు ఏవీ లేవు',
      'No completed trips': 'పూర్తయిన ట్రిప్పులు ఏవీ లేవు',
      'Pickup': 'పికప్',
      'Drop': 'డ్రాప్',
      'Fare': 'ఛార్జీ',
      'View Details': 'వివరాలు చూడండి',
      'Start Trip': 'ట్రిప్ ప్రారంభించండి',
      'Complete Trip': 'ట్రిప్ పూర్తి చేయండి',

      // Wallet / Earnings Screen
      'Wallet & Settlements': 'వాలెట్ & సెటిల్‌మెంట్‌లు',
      'Available Balance': 'అందుబాటులో ఉన్న బ్యాలెన్స్',
      'Bank Account Details': 'బ్యాంక్ ఖాతా వివరాలు',
      'Withdraw Funds': 'నిధులు విత్‌డ్రా చేయండి',
      'Withdrawal History': 'విత్‌డ్రా చరిత్ర',
      'Total Earned': 'మొత్తం సంపాదన',
      'Bank Account': 'బ్యాంక్ ఖాతా',
      'Account Number': 'ఖాతా సంఖ్య',
      'IFSC Code': 'IFSC కోడ్',
      'Withdraw': 'విత్‌డ్రా',
      'History': 'చరిత్ర',
      'Recent Transactions': 'ఇటీవలి లావాదేవీలు',
      'No transactions yet': 'ఇంకా ఎలాంటి లావాదేవీలు లేవు',
    },
  };

  /// Translate a given key using the active language code with smart case-insensitive fallback.
  static String translate(String key, {String? languageCode}) {
    if (key.trim().isEmpty) return key;
    final lang = languageCode ?? 'en';
    final langMap = _translations[lang];
    if (langMap != null) {
      if (langMap.containsKey(key)) return langMap[key]!;
      final trimmed = key.trim();
      if (langMap.containsKey(trimmed)) return langMap[trimmed]!;
      final lowerKey = trimmed.toLowerCase();
      for (final entry in langMap.entries) {
        if (entry.key.toLowerCase() == lowerKey) {
          return entry.value;
        }
      }
    }
    // Fallback to English
    final enMap = _translations['en'];
    if (enMap != null) {
      if (enMap.containsKey(key)) return enMap[key]!;
      final trimmed = key.trim();
      if (enMap.containsKey(trimmed)) return enMap[trimmed]!;
      final lowerKey = trimmed.toLowerCase();
      for (final entry in enMap.entries) {
        if (entry.key.toLowerCase() == lowerKey) {
          return entry.value;
        }
      }
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
