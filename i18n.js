// space-invaders-bd — English / Bangla strings (plain ASCII roman transliteration
// is not used for UI; Bangla script is used directly in the bn table).
'use strict';

const I18N = {
  en: {
    title: 'Space Invaders BD',
    subtitle: 'Classic arcade shooter — defend Earth from the invader fleet',
    score: 'Score',
    best: 'Best',
    lives: 'Lives',
    level: 'Level',
    difficulty: 'Difficulty',
    easy: 'Easy',
    normal: 'Normal',
    hard: 'Hard',
    start: 'Start game',
    pause: 'Pause',
    resume: 'Resume',
    restart: 'Restart',
    sound: 'Sound',
    on: 'On',
    off: 'Off',
    howTo: 'How to play',
    howToBody: 'Move with ← → or A / D (or the on-screen buttons). Fire with Space or the FIRE button. Only one of your bullets flies at a time — make it count. Destroy the whole fleet to clear the level; each level gets faster. Hide behind the green shields — they erode when hit. Shoot the red UFO for a bonus (50–300 pts). You earn an extra life at 1,000 points.',
    startOverlayTitle: 'Defend Earth!',
    startOverlayBody: '50 invaders are marching down. Top row 30 pts, middle rows 20 pts, bottom rows 10 pts. Good luck, commander.',
    paused: 'Paused',
    gameOver: 'Game over',
    levelClear: 'Level cleared!',
    levelClearBody: 'Fleet destroyed — +200 bonus. The next wave is faster.',
    playAgain: 'Play again',
    nextLevel: 'Next level',
    finalScore: 'Final score',
    accuracy: 'Accuracy',
    kills: 'Invaders destroyed',
    shots: 'Shots fired',
    newBest: 'New best score!',
    ufoBonus: 'UFO bonus!',
    extraLife: 'Extra life!',
    moveLeft: 'Move left',
    moveRight: 'Move right',
    fire: 'FIRE',
    disclaimer: 'Offline toy arcade game. Not affiliated with the original Space Invaders. Scores are stored only on this device.',
    keyboardHint: '← → move · Space fire · P pause',
  },
  bn: {
    title: 'স্পেস ইনভেডার্স বিডি',
    subtitle: 'ক্লাসিক আর্কেড শুটার — আক্রমণকারী বহর থেকে পৃথিবীকে রক্ষা করুন',
    score: 'স্কোর',
    best: 'সেরা',
    lives: 'জীবন',
    level: 'লেভেল',
    difficulty: 'কঠিনতা',
    easy: 'সহজ',
    normal: 'সাধারণ',
    hard: 'কঠিন',
    start: 'খেলা শুরু',
    pause: 'বিরতি',
    resume: 'চালিয়ে যান',
    restart: 'আবার শুরু',
    sound: 'শব্দ',
    on: 'চালু',
    off: 'বন্ধ',
    howTo: 'কীভাবে খেলবেন',
    howToBody: '← → বা A / D দিয়ে নড়ুন (অথবা স্ক্রিনের বোতাম)। Space বা FIRE বোতামে গুলি করুন। একসাথে আপনার একটিই গুলি উড়বে — সঠিকভাবে লক্ষ্য করুন। পুরো বহর ধ্বংস করলে লেভেল শেষ; প্রতি লেভেলে গতি বাড়বে। সবুজ ঢালের আড়ালে লুকান — আঘাতে ঢাল ক্ষয়ে যায়। লাল UFO-তে গুলি করলে বোনাস (৫০–৩০০ পয়েন্ট)। ১,০০০ পয়েন্টে একটি অতিরিক্ত জীবন পাবেন।',
    startOverlayTitle: 'পৃথিবীকে রক্ষা করুন!',
    startOverlayBody: '৫০টি আক্রমণকারী নেমে আসছে। উপরের সারি ৩০ পয়েন্ট, মাঝের সারি ২০ পয়েন্ট, নিচের সারি ১০ পয়েন্ট। শুভকামনা, কমান্ডার।',
    paused: 'বিরতি',
    gameOver: 'খেলা শেষ',
    levelClear: 'লেভেল শেষ!',
    levelClearBody: 'বহর ধ্বংস — +২০০ বোনাস। পরের ঢেউ আরও দ্রুত।',
    playAgain: 'আবার খেলুন',
    nextLevel: 'পরের লেভেল',
    finalScore: 'চূড়ান্ত স্কোর',
    accuracy: 'নির্ভুলতা',
    kills: 'ধ্বংস করা আক্রমণকারী',
    shots: 'গুলি ছোড়া হয়েছে',
    newBest: 'নতুন সেরা স্কোর!',
    ufoBonus: 'UFO বোনাস!',
    extraLife: 'অতিরিক্ত জীবন!',
    moveLeft: 'বামে যান',
    moveRight: 'ডানে যান',
    fire: 'গুলি',
    disclaimer: 'অফলাইন খেলার আর্কেড গেম। মূল Space Invaders-এর সঙ্গে সম্পর্কিত নয়। স্কোর শুধু এই ডিভাইসেই সংরক্ষিত হয়।',
    keyboardHint: '← → নড়াচড়া · Space গুলি · P বিরতি',
  },
};

function bnDigits(n) {
  const d = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(n).replace(/[0-9]/g, (m) => d[+m]);
}

function fmtNum(n, lang) {
  return lang === 'bn' ? bnDigits(n) : String(n);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { I18N, bnDigits, fmtNum };
}
