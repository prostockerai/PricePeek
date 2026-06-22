# PricePeekBD – Peek Before You Pay.

বাংলাদেশের শীর্ষ অনলাইন স্টোরগুলোতে এক ক্লিকে মূল্য তুলনা করুন।
Support: Daraz, Star Tech, Ryans, Pickaboo, Gadget & Gear, TechLand, Othoba, AjkerDeal, Bikroy.

## 🚀 কিভাবে চালাবেন
1. `npm install`
2. `vercel dev` (Vercel CLI দিয়ে লোকাল সার্ভার)
3. সরাসরি `index.html` ওপেন করলে API কাজ করবে না, কারণ CORS। তাই Vercel বা লোকাল Vercel পরিবেশে রান করুন।

## 📦 ডেপ্লয়
- GitHub-এ পুরো প্রোজেক্ট পুশ করে Vercel-এ ইম্পোর্ট করুন।
- Framework: **Other** সেট করুন।
- Environment Variable লাগবে না।

## 🧑‍💻 টেক স্ট্যাক
- ফ্রন্টএন্ড: HTML/CSS/JS (স্ট্যাটিক)
- ব্যাকএন্ড: Vercel Serverless Functions (Node.js + axios + cheerio)
- স্ক্র্যাপিং: ৪টি বড় মার্কেটপ্লেসের জন্য আলাদা Scraper ক্লাস
