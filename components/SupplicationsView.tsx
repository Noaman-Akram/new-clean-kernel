
import React, { useState } from 'react';
import { Sun, Moon, Sparkles, RotateCcw } from 'lucide-react';

// Static Data for Adhkar (Expanded)
const ADHKAR_DATA = {
    MORNING: [
        {
            id: 'm_kursi',
            arabic: 'اللّهُ لاَ إِلَـهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ لاَ تَأْخُذُهُ سِنَةٌ وَلاَ نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلاَّ بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلاَ يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاَّ بِمَا شَاء وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالأَرْضَ وَلاَ يَؤُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ',
            translation: 'Ayat al-Kursi: Allah! There is no deity but He, the Ever-Living, the Sustainer of existence...',
            count: 1
        },
        {
            id: 'm_ikhlas',
            arabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ، ٱللَّهُ ٱلصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ',
            translation: 'Surah Al-Ikhlas',
            count: 3
        },
        {
            id: 'm_falaq',
            arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ، مِن شَرِّ مَا خَلَقَ، وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ، وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ، وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
            translation: 'Surah Al-Falaq',
            count: 3
        },
        {
            id: 'm_nas',
            arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ، مَلِكِ ٱلنَّاسِ، إِلَٰهِ ٱلنَّاسِ، مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ، ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ، مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ',
            translation: 'Surah An-Nas',
            count: 3
        },
        {
            id: 'm_asbahna',
            arabic: 'أَصْبَـحْـنا وَأَصْبَـحَ المُـلْكُ لله وَالحَمدُ لله ، لا إلهَ إلاّ اللّهُ وَحدَهُ لا شَريكَ لهُ، لهُ المُـلكُ ولهُ الحَمْـد، وهُوَ على كلّ شَيءٍ قدير',
            translation: 'We have entered a new day and with it all dominion is Allah’s, and praise is to Allah...',
            count: 1
        },
        {
            id: 'm_shukr',
            arabic: 'اللّهُـمَّ ما أَصْبَـَحَ بي مِـنْ نِعْـمَةٍ أَو بِأَحَـدٍ مِـنْ خَلْـقِك، فَمِـنْكَ وَحْـدَكَ لا شريكَ لَـك، فَلَـكَ الْحَمْـدُ وَلَـكَ الشُّكْـر',
            translation: 'O Allah, whatever blessing has been received by me or anyone of Your creation is from You alone, You have no partner. You have our praise and You have our gratitude.',
            count: 1
        },
        {
            id: 'm_bika',
            arabic: 'اللّهُـمَّ بِكَ أَصْـبَحْنا وَبِكَ أَمْسَـينا ، وَبِكَ نَحْـيا وَبِكَ نَمُـوتُ وَإِلَـيْكَ النُّـشُور',
            translation: 'O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the Final Return.',
            count: 1
        },
        {
            id: 'm_istighfar',
            arabic: 'اللّهـمَّ أَنْتَ رَبِّـي لا إلهَ إلاّ أَنْتَ ، خَلَقْتَنـي وَأَنا عَبْـدُك ، وَأَنا عَلـى عَهْـدِكَ وَوَعْـدِكَ ما اسْتَـطَعْـت ، أَعـوذُ بِكَ مِنْ شَـرِّ ما صَنَـعْت ، أَبـوءُ لَـكَ بِنِعْـمَتِـكَ عَلَـيَّ وَأَبـوءُ بِذَنْـبي فَاغْفـِرْ لي فَإِنَّـهُ لا يَغْـفِرُ الذُّنـوبَ إِلاّ أَنْتَ',
            translation: 'Sayyidul Istighfar: O Allah, You are my Lord, there is no valid god but You...',
            count: 1
        },
        {
            id: 'm_afini',
            arabic: 'اللّهُـمَّ عافِـني في بَدَنـي ، اللّهُـمَّ عافِـني في سَمْـعي ، اللّهُـمَّ عافِـني في بَصَـري ، لا إلهَ إلاّ أَنْـتَ',
            translation: 'O Allah, make me healthy in my body. O Allah, preserve for me my hearing. O Allah, preserve for me my sight. There is no valid god but You.',
            count: 3
        },
        {
            id: 'm_afwa',
            arabic: 'اللّهُـمَّ إِنِّـي أسْـأَلُـكَ العَـافِـيَةَ في الدُّنْـيا وَالآخِـرَة ، اللّهُـمَّ إِنِّـي أسْـأَلُـكَ العَفْـوَ وَالعافِـيةَ في ديني وَدُنْـยายَ وَأهْـلي وَمالـي ، اللّهُـمَّ اسْتُـرْ عـوْراتي وَآمِـنْ رَوْعاتـي',
            translation: 'O Allah, I ask You for pardon and well-being in this world and the next...',
            count: 1
        },
        {
            id: 'm_alim',
            arabic: 'اللّهُـمَّ عالِـمَ الغَـيْبِ وَالشّـهادَةِ فاطِـرَ السّماواتِ وَالأرْضِ رَبَّ كـلِّ شَـيءٍ وَمَليـكَه ، أَشْهَـدُ أَنْ لا إِلهَ إِلاّ أَنْت ، أَعـوذُ بِكَ مِن شَـرِّ نَفْسـي وَمِن شَـرِّ الشَّيْـطانِ وَشِرْكِـه ، وَأَنْ أَقْتَـرِفَ عَلـى نَفْسـي سوءاً أَوْ أَجُـرَّهُ إِلى مُسْـلِم',
            translation: 'O Allah, Knower of the unseen and the evident, Maker of the heavens and the earth...',
            count: 1
        },
        {
            id: 'm_bismillah',
            arabic: 'بِسـمِ اللهِ الذي لا يَضُـرُّ مَعَ اسمِـهِ شَيءٌ في الأرْضِ وَلا في السّمـاءِ وَهـوَ السّمـيعُ العَلـيم',
            translation: 'In the Name of Allah, Who with His Name nothing can cause harm in the earth nor in the heavens...',
            count: 3
        },
        {
            id: 'm_raditu',
            arabic: 'رَضيـتُ بِاللهِ رَبَّـاً وَبِالإسْلامِ ديـناً وَبِمُحَـمَّدٍ صلى الله عليه وسلم نَبِيّـاً',
            translation: 'I am pleased with Allah as my Lord, with Islam as my religion and with Muhammad as my Prophet.',
            count: 3
        },
        {
            id: 'm_hasbi',
            arabic: 'حَسْبِـيَ اللّهُ لا إلهَ إلاّ هُوَ عَلَـيهِ تَوَكَّـلتُ وَهُوَ رَبُّ العَرْشِ العَظـيم',
            translation: 'Allah is sufficient for me. There is no valid god but Him. I have placed my trust in Him, and He is the Lord of the Majestic Throne.',
            count: 7
        },
        {
            id: 'm_hayyu',
            arabic: 'يا حَـيُّ يا قَيّـومُ بِـرَحْمَـتِكِ أَسْتَـغـيث ، أَصْلِـحْ لي شَـأْنـي كُلَّـه ، وَلا تَكِلـني إِلى نَفْـسي طَـرْفَةَ عَـين',
            translation: 'O Ever Living One, O Eternal One, by Your mercy I call on You to set right all my affairs...',
            count: 1
        },
        {
            id: 'm_fitra',
            arabic: 'أَصْبَـحْـنا عَلَى فِطْرَةِ الإسْلامِ، وَعَلَى كَلِمَةِ الإخْلاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفاً مُسْلِماً وَمَا كَانَ مِنَ الْمُشْرِكِينَ',
            translation: 'We have entered a new day upon the natural religion of Islam, the word of sincere devotion...',
            count: 1
        },
        {
            id: 'm_subhan',
            arabic: 'سُبْحـانَ اللهِ وَبِحَمْـدِهِ',
            translation: 'Glory is to Allah and praise is to Him.',
            count: 100
        },
        {
            id: 'm_lailaha',
            arabic: 'لا إلهَ إلاّ اللّهُ وحدَهُ لا شريكَ لهُ، لهُ المُـلْكُ ولهُ الحَمْـد، وهُوَ على كُلّ شَيءٍ قَدير',
            translation: 'None has the right to be worshipped but Allah alone, Who has no partner...',
            count: 100
        },
        {
            id: 'm_adada',
            arabic: 'سُبْحـانَ اللهِ وَبِحَمْـدِهِ عَدَدَ خَلْـقِه ، وَرِضـا نَفْسِـه ، وَزِنَـةَ عَـرْشِـه ، وَمِـدادَ كَلِمـاتِـه',
            translation: 'Glory is to Allah and praise is to Him, by the multitude of His creation, by His Pleasure...',
            count: 3
        },
        {
            id: 'm_ilman',
            arabic: 'اللّهُـمَّ إِنِّـي أَسْأَلُـكَ عِلْمـاً نافِعـاً وَرِزْقـاً طَيِّـباً ، وَعَمَـلاً مُتَقَبَّـلاً',
            translation: 'O Allah, I ask You for knowledge that is of benefit, a good provision, and deeds that will be accepted.',
            count: 1
        },
        {
            id: 'm_astaghfir',
            arabic: 'أَسْتَغْفِرُ اللهَ وَأَتُوبُ إِلَيْهِ',
            translation: 'I seek forgiveness from Allah and repent to Him.',
            count: 100
        }
    ],
    EVENING: [
        {
            id: 'e_kursi',
            arabic: 'اللّهُ لاَ إِلَـهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ لاَ تَأْخُذُهُ سِنَةٌ وَلاَ نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلاَّ بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلاَ يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاَّ بِمَا شَاء وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالأَرْضَ وَلاَ يَؤُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ',
            translation: 'Ayat al-Kursi (2:255)',
            count: 1
        },
        {
            id: 'e_ikhlas',
            arabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ، ٱللَّهُ ٱلصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ',
            translation: 'Surah Al-Ikhlas',
            count: 3
        },
        {
            id: 'e_falaq',
            arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ، مِن شَرِّ مَا خَلَقَ، وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ، وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ، وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
            translation: 'Surah Al-Falaq',
            count: 3
        },
        {
            id: 'e_nas',
            arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ، مَلِكِ ٱلنَّاسِ، إِلَٰهِ ٱلنَّاسِ، مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ، ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ، مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ',
            translation: 'Surah An-Nas',
            count: 3
        },
        {
            id: 'e_amsayna',
            arabic: 'أَمْسَيْـنا وَأَمْسـى المُـلْكُ لله وَالحَمدُ لله ، لا إلهَ إلاّ اللّهُ وَحدَهُ لا شَريكَ لهُ، لهُ المُـلكُ ولهُ الحَمْـد، وهُوَ على كلّ شَيءٍ قدير',
            translation: 'We have entered the evening and with it all dominion is Allah’s, and praise is to Allah...',
            count: 1
        },
        {
            id: 'e_shukr',
            arabic: 'اللّهُـمَّ ما أَمْسَى بي مِـنْ نِعْـمَةٍ أَو بِأَحَـدٍ مِـنْ خَلْـقِك، فَمِـنْكَ وَحْـدَكَ لا شريكَ لَـك، فَلَـكَ الْحَمْـدُ وَلَـكَ الشُّكْـر',
            translation: 'O Allah, whatever blessing has been received by me or anyone of Your creation is from You alone, You have no partner. You have our praise and You have our gratitude.',
            count: 1
        },
        {
            id: 'e_bika',
            arabic: 'اللّهُـمَّ بِكَ أَمْسَـينا وَبِكَ أَصْـبَحْنا، وَبِكَ نَحْـيا وَبِكَ نَمُـوتُ وَإِلَـيْكَ الْمَصِير',
            translation: 'O Allah, by You we enter the evening and by You we enter the morning, by You we live and by You we die, and to You is the final return.',
            count: 1
        },
        {
            id: 'e_istighfar',
            arabic: 'اللّهـمَّ أَنْتَ رَبِّـي لا إلهَ إلاّ أَنْتَ ، خَلَقْتَنـي وَأَنا عَبْـدُك ، وَأَنا عَلـى عَهْـدِكَ وَوَعْـدِكَ ما اسْتَـطَعْـت ، أَعـوذُ بِكَ مِنْ شَـرِّ ما صَنَـعْت ، أَبـوءُ لَـكَ بِنِعْـمَتِـكَ عَلَـيَّ وَأَبـوءُ بِذَنْـبي فَاغْفـِرْ لي فَإِنَّـهُ لا يَغْـفِرُ الذُّنـوبَ إِلاّ أَنْتَ',
            translation: 'Sayyidul Istighfar: O Allah, You are my Lord, there is no valid god but You...',
            count: 1
        },
        {
            id: 'e_afini',
            arabic: 'اللّهُـمَّ عافِـني في بَدَنـي ، اللّهُـمَّ عافِـني في سَمْـعي ، اللّهُـمَّ عافِـني في بَصَـري ، لا إلهَ إلاّ أَنْـتَ',
            translation: 'O Allah, make me healthy in my body. O Allah, preserve for me my hearing. O Allah, preserve for me my sight. There is no valid god but You.',
            count: 3
        },
        {
            id: 'e_afwa',
            arabic: 'اللّهُـمَّ إِنِّـي أسْـأَلُـكَ العَـافِـيَةَ في الدُّنْـيا وَالآخِـرَة ، اللّهُـمَّ إِنِّـي أسْـأَلُـكَ العَفْـوَ وَالعافِـيةَ في ديني وَدُنْـยายَ وَأهْـلي وَمالـي ، اللّهُـمَّ اسْتُـرْ عـوْراتي وَآمِـنْ رَوْعاتـي',
            translation: 'O Allah, I ask You for pardon and well-being in this world and the next...',
            count: 1
        },
        {
            id: 'e_alim',
            arabic: 'اللّهُـمَّ عالِـمَ الغَـيْبِ وَالشّـهادَةِ فاطِـرَ السّماواتِ وَالأرْضِ رَبَّ كـلِّ شَـيءٍ وَمَليـكَه ، أَشْهَـدُ أَنْ لا إِلهَ إِلاّ أَنْت ، أَعـوذُ بِكَ مِن شَـرِّ نَفْسـي وَمِن شَـرِّ الشَّيْـطانِ وَشِرْكِـه ، وَأَنْ أَقْتَـرِفَ عَلـى نَفْسـي سوءاً أَوْ أَجُـرَّهُ إِلى مُسْـلِم',
            translation: 'O Allah, Knower of the unseen and the evident, Maker of the heavens and the earth...',
            count: 1
        },
        {
            id: 'e_bismillah',
            arabic: 'بِسـمِ اللهِ الذي لا يَضُـرُّ مَعَ اسمِـهِ شَيءٌ في الأرْضِ وَلا في السّمـاءِ وَهـوَ السّمـيعُ العَلـيم',
            translation: 'In the Name of Allah, Who with His Name nothing can cause harm in the earth nor in the heavens...',
            count: 3
        },
        {
            id: 'e_raditu',
            arabic: 'رَضيـتُ بِاللهِ رَبَّـاً وَبِالإسْلامِ ديـناً وَبِمُحَـمَّدٍ صلى الله عليه وسلم نَبِيّـاً',
            translation: 'I am pleased with Allah as my Lord, with Islam as my religion and with Muhammad as my Prophet.',
            count: 3
        },
        {
            id: 'e_hasbi',
            arabic: 'حَسْبِـيَ اللّهُ لا إلهَ إلاّ هُوَ عَلَـيهِ تَوَكَّـلتُ وَهُوَ رَبُّ العَرْشِ العَظـيم',
            translation: 'Allah is sufficient for me. There is no valid god but Him. I have placed my trust in Him, and He is the Lord of the Majestic Throne.',
            count: 7
        },
        {
            id: 'e_hayyu',
            arabic: 'يا حَـيُّ يا قَيّـومُ بِـرَحْمَـتِكِ أَسْتَـغـيث ، أَصْلِـحْ لي شَـأْنـي كُلَّـه ، وَلا تَكِلـني إِلى نَفْـسي طَـرْفَةَ عَـين',
            translation: 'O Ever Living One, O Eternal One, by Your mercy I call on You to set right all my affairs...',
            count: 1
        },
        {
            id: 'e_fitra',
            arabic: 'أَمْسَيْـنا عَلَى فِطْرَةِ الإسْلامِ، وَعَلَى كَلِمَةِ الإخْلاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفاً مُسْلِماً وَمَا كَانَ مِنَ الْمُشْرِكِينَ',
            translation: 'We have entered the evening upon the natural religion of Islam, the word of sincere devotion...',
            count: 1
        },
        {
            id: 'e_subhan',
            arabic: 'سُبْحـانَ اللهِ وَبِحَمْـدِهِ',
            translation: 'Glory is to Allah and praise is to Him.',
            count: 100
        },
        {
            id: 'e_lailaha',
            arabic: 'لا إلهَ إلاّ اللّهُ وحدَهُ لا شريكَ لهُ، لهُ المُـلْكُ ولهُ الحَمْـد، وهُوَ على كُلّ شَيءٍ قَدير',
            translation: 'None has the right to be worshipped but Allah alone, Who has no partner...',
            count: 100
        },
        {
            id: 'e_audhu',
            arabic: 'أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
            translation: 'I seek refuge in Allah’s perfect words from the evil He has created.',
            count: 3
        },
        {
            id: 'e_astaghfir',
            arabic: 'أَسْتَغْفِرُ اللهَ وَأَتُوبُ إِلَيْهِ',
            translation: 'I seek forgiveness from Allah and repent to Him.',
            count: 100
        }
    ],
    PRAYER: [
        {
            id: 'p_kursi',
            arabic: 'اللّهُ لاَ إِلَـهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ لاَ تَأْخُذُهُ سِنَةٌ وَلاَ نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلاَّ بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلاَ يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاَّ بِمَا شَاء وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالأَرْضَ وَلاَ يَؤُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ',
            translation: 'Ayat al-Kursi: Allah! There is no deity but He, the Ever-Living, the Sustainer of existence...',
            count: 1
        },
        {
            id: 'p_ikhlas',
            arabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ، ٱللَّهُ ٱلصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ',
            translation: 'Surah Al-Ikhlas',
            count: 1
        },
        {
            id: 'p_falaq',
            arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ، مِن شَرِّ مَا خَلَقَ، وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ، وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ، وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
            translation: 'Surah Al-Falaq',
            count: 1
        },
        {
            id: 'p_nas',
            arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ، مَلِكِ ٱلنَّاسِ، إِلَٰهِ ٱلنَّاسِ، مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ، ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ، مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ',
            translation: 'Surah An-Nas',
            count: 1
        },
        {
            id: 'p_subhan',
            arabic: 'سُبْحَانَ اللهِ',
            translation: 'Glory be to Allah',
            count: 33
        },
        {
            id: 'p_alhamdulillah',
            arabic: 'الْحَمْدُ للّهِ',
            translation: 'All praise is due to Allah',
            count: 33
        },
        {
            id: 'p_takbir',
            arabic: 'اللهُ أَكْبَرُ',
            translation: 'Allah is the Greatest',
            count: 34
        },
        {
            id: 'p_tahlil',
            arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
            translation: 'There is no god but Allah alone, with no partner. His is the dominion, and His is the praise, and He has power over all things.',
            count: 1
        },
        {
            id: 'p_rabbighfir',
            arabic: 'رَبِّ اغْفِرْ لِي',
            translation: 'My Lord, forgive me.',
            count: 3
        },
        {
            id: 'p_astaghfirullah',
            arabic: 'أَسْتَغْفِرُ اللهَ',
            translation: 'I seek forgiveness from Allah.',
            count: 3
        },
        {
            id: 'p_allahumma_anta',
            arabic: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
            translation: 'O Allah, You are Peace and from You comes peace. Blessed are You, O Possessor of majesty and honor.',
            count: 1
        }
    ],
    GENERAL: [
        {
            id: 'g1',
            arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
            translation: 'Our Lord! Give us in this world that which is good and in the Hereafter that which is good, and save us from the torment of the Fire!',
            count: 1
        },
        {
            id: 'g2',
            arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ',
            translation: 'O Allah, I ask You for well-being in this world and the Hereafter.',
            count: 1
        },
        {
            id: 'g3',
            arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِّن لِّسَانِي يَفْقَهُوا قَوْلِي',
            translation: 'My Lord, expand for me my breast, and ease for me my task...',
            count: 1
        }
    ]
};

import { getPrayerSchedule } from '../utils';
import { AppState } from '../types';
import { CheckCircle2, Circle, Zap } from 'lucide-react';
import { DEFAULT_TIME_ZONE, getDateKeyInTimeZone } from '../utils/dateTime';

interface Props {
    state: AppState;
    onPrayerToggle: (key: string) => void;
    onAdhkarToggle: (key: string) => void;
}

const SupplicationsView: React.FC<Props> = ({ state, onPrayerToggle, onAdhkarToggle }) => {
    const [activeTab, setActiveTab] = useState<'MORNING' | 'EVENING' | 'PRAYER' | 'GENERAL'>('MORNING');
    const [counts, setCounts] = useState<Record<string, number>>({});

    // Prayer Logic
    const prayers = getPrayerSchedule();
    const timeZone = state.userPreferences?.timeZone || DEFAULT_TIME_ZONE;
    const todayKey = getDateKeyInTimeZone(new Date(), timeZone);

    // Adhkar Global State
    const adhkarKey = `${todayKey}-${activeTab}`;
    const isAdhkarComplete = state.adhkarLog?.[adhkarKey];

    const handleCount = (id: string, max: number) => {
        setCounts(prev => {
            const current = prev[id] || 0;
            if (current >= max) return prev;
            return { ...prev, [id]: current + 1 };
        });
    };

    const handleReset = () => setCounts({});

    const handleToggleComplete = () => {
        if (activeTab === 'GENERAL') return;
        onAdhkarToggle(adhkarKey);
    };

    const list = ADHKAR_DATA[activeTab];

    return (
        <div className="h-full flex flex-col bg-background animate-fade-in overflow-hidden">
            {/* HEADER */}
            <div className="h-16 border-b border-border bg-surface flex items-center justify-between px-4 md:px-8 shrink-0">
                <div className="flex items-center gap-3 text-zinc-200 font-medium">
                    <Sparkles size={18} className="text-emerald-500" />
                    <span className="hidden md:inline">THE SANCTUARY</span>
                    <span className="md:hidden">SANCTUARY</span>
                </div>
                <div className="flex gap-2">
                    <Tab active={activeTab === 'MORNING'} onClick={() => setActiveTab('MORNING')} icon={<Sun size={14} />} label="AM" fullLabel="Morning" />
                    <Tab active={activeTab === 'EVENING'} onClick={() => setActiveTab('EVENING')} icon={<Moon size={14} />} label="PM" fullLabel="Evening" />
                    <Tab active={activeTab === 'PRAYER'} onClick={() => setActiveTab('PRAYER')} icon={<Zap size={14} />} label="Prayer" fullLabel="After Prayer" />
                    <Tab active={activeTab === 'GENERAL'} onClick={() => setActiveTab('GENERAL')} icon={<Sparkles size={14} />} label="Du'a" />
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto w-full space-y-6 md:space-y-8">

                    {/* PRAYER TIMELINE WIDGET */}
                    <div className="bg-surface border border-border rounded-lg p-4 md:p-6 mb-8">
                        <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Zap size={12} /> Daily Salah Protocol
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                            {prayers.map(p => {
                                const key = `${todayKey}-${p.name}`;
                                const isDone = state.prayerLog[key];
                                return (
                                    <button
                                        key={p.name}
                                        onClick={() => onPrayerToggle(key)}
                                        className={`
                                            flex flex-col items-center justify-center p-3 md:p-4 rounded border transition-all
                                            ${isDone
                                                ? 'bg-emerald-950/20 border-emerald-900/50'
                                                : 'bg-background border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'}
                                        `}
                                    >
                                        <div className={`mb-1 md:mb-2 ${isDone ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                            {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                        </div>
                                        <div className={`font-medium text-sm md:text-base ${isDone ? 'text-zinc-200' : 'text-zinc-400'}`}>{p.name}</div>
                                        <div className="text-[10px] md:text-xs font-mono text-zinc-600 mt-1">{p.time}</div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            {activeTab !== 'GENERAL' && (
                                <button
                                    onClick={handleToggleComplete}
                                    className={`
                                        flex items-center gap-2 px-3 md:px-4 py-2 rounded text-xs font-medium border transition-all
                                        ${isAdhkarComplete
                                            ? 'bg-emerald-950/30 text-emerald-500 border-emerald-900/50'
                                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'}
                                    `}
                                >
                                    {isAdhkarComplete ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                    <span className="hidden md:inline">MARK SESSION COMPLETE</span>
                                    <span className="md:hidden">COMPLETE</span>
                                </button>
                            )}
                        </div>
                        <button onClick={handleReset} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300">
                            <RotateCcw size={12} /> <span className="hidden md:inline">Reset Counters</span> <span className="md:hidden">Reset</span>
                        </button>
                    </div>

                    {list.map(dhikr => {
                        const current = counts[dhikr.id] || 0;
                        const isDone = current >= dhikr.count;

                        return (
                            <div
                                key={dhikr.id}
                                onClick={() => handleCount(dhikr.id, dhikr.count)}
                                className={`
                                 p-4 md:p-6 rounded-lg border transition-all duration-300 cursor-pointer hover:shadow-md
                                 ${isDone ? 'bg-emerald-950/10 border-emerald-900/50' : 'bg-surface border-border hover:bg-surface/80'}
                             `}>
                                <div className="text-right mb-4 md:mb-6 pointer-events-none">
                                    <p className="text-xl md:text-3xl leading-relaxed font-serif text-zinc-100" style={{ fontFamily: 'Amiri, serif' }}>
                                        {dhikr.arabic}
                                    </p>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pointer-events-none">
                                    <p className="text-xs md:text-sm text-zinc-500 max-w-lg leading-relaxed italic">
                                        {dhikr.translation}
                                    </p>

                                    <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end w-full md:w-auto mt-2 md:mt-0">
                                        <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                                            {current} / {dhikr.count}
                                        </div>
                                        <div
                                            className={`
                                                w-12 h-12 rounded-full flex items-center justify-center border transition-all
                                                ${isDone
                                                    ? 'bg-emerald-500 text-black border-emerald-400'
                                                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'}
                                            `}
                                        >
                                            {isDone ? <Sparkles size={18} fill="currentColor" /> : <PlusIcon />}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 h-1 w-full bg-zinc-800 rounded-full overflow-hidden pointer-events-none">
                                    <div
                                        className={`h-full transition-all duration-300 ${isDone ? 'bg-emerald-500' : 'bg-zinc-600'}`}
                                        style={{ width: `${(current / dhikr.count) * 100}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}

                    <div className="h-20 flex items-center justify-center text-zinc-600 text-sm font-mono opacity-50">
                        *** END OF SECTION ***
                    </div>
                </div>
            </div>
        </div>
    );
};

const Tab = ({ active, onClick, icon, label, fullLabel }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full border text-xs font-medium transition-all ${active ? 'bg-zinc-100 text-black border-white' : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}
    >
        {icon}
        <span className="md:hidden">{label}</span>
        <span className="hidden md:inline">{fullLabel || label}</span>
    </button>
);

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
)

export default SupplicationsView;
