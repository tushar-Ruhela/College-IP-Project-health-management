import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const medicalKnowledgeSchema = new mongoose.Schema({
  title: String,
  content: String,
  keywords: [String],
  category: String,
  source: String,
  embedding: [Number],
  createdAt: { type: Number, default: () => Date.now() }
}, { collection: 'medicalknowledge', timestamps: false });

const MedicalKnowledge = mongoose.models.MedicalKnowledge || 
  mongoose.model('MedicalKnowledge', medicalKnowledgeSchema);

const knowledgeBase = [
  {
    title: 'Fever (Pyrexia)',
    content: 'A fever is a temporary increase in your body temperature, often due to an illness. For adults, a fever is generally not a concern unless it reaches 103°F (39.4°C) or higher. Home remedies include drinking plenty of fluids, resting, and taking over-the-counter medications like acetaminophen (Tylenol) or ibuprofen (Advil). Seek immediate medical attention if accompanied by a severe headache, stiff neck, rash, or difficulty breathing.',
    keywords: ['fever', 'temperature', 'hot', 'chills', 'pyrexia', 'acetaminophen', 'ibuprofen'],
    category: 'Symptoms & Conditions',
    source: 'General Medical Knowledge'
  },
  {
    title: 'Common Cold',
    content: 'The common cold is a viral infection of your nose and throat. Symptoms include runny or stuffy nose, sore throat, cough, congestion, slight body aches or a mild headache, sneezing, and low-grade fever. There is no cure for a cold, but you can manage symptoms by resting, staying hydrated, and using OTC cold medicines. Most people recover in 7 to 10 days.',
    keywords: ['cold', 'cough', 'runny nose', 'sore throat', 'sneezing', 'congestion'],
    category: 'Symptoms & Conditions',
    source: 'General Medical Knowledge'
  },
  {
    title: 'Headache',
    content: 'Headaches are pain in any region of the head. Common types include tension headaches, migraines, and cluster headaches. Mild to moderate headaches can often be treated with OTC pain relievers (ibuprofen, acetaminophen), resting in a quiet, dark room, and staying hydrated. Consult a doctor if the headache is sudden and severe, or accompanied by fever, stiff neck, confusion, or weakness.',
    keywords: ['headache', 'migraine', 'head pain', 'tension', 'throbbing'],
    category: 'Symptoms & Conditions',
    source: 'General Medical Knowledge'
  },
  {
    title: 'Stomach Ache (Abdominal Pain)',
    content: 'Abdominal pain can range from mild aches to severe cramps. Common causes include indigestion, constipation, stomach virus, menstrual cramps, or food poisoning. For mild pain, stick to clear fluids, eat bland foods (BRAT diet: bananas, rice, applesauce, toast), and avoid dairy or spicy foods. Seek emergency care if pain is sudden and severe, or if accompanied by bloody stools, persistent vomiting, or yellowing of skin.',
    keywords: ['stomach', 'belly', 'ache', 'pain', 'cramps', 'indigestion', 'nausea', 'vomiting', 'diarrhea'],
    category: 'Symptoms & Conditions',
    source: 'General Medical Knowledge'
  },
  {
    title: 'Type 2 Diabetes Management',
    content: 'Type 2 diabetes is a chronic condition that affects how the body metabolizes glucose. Management involves a healthy diet (focusing on whole grains, vegetables, and lean proteins), regular physical activity (at least 150 minutes a week), weight loss if needed, monitoring blood sugar levels, and taking prescribed medications like metformin or insulin. Regular checkups are essential to prevent complications.',
    keywords: ['diabetes', 'sugar', 'glucose', 'insulin', 'metformin', 'type 2'],
    category: 'Chronic Conditions',
    source: 'General Medical Knowledge'
  },
  {
    title: 'Hypertension (High Blood Pressure)',
    content: 'Hypertension is a common condition where the long-term force of the blood against your artery walls is high enough that it may eventually cause health problems, such as heart disease. Management includes a low-sodium diet (DASH diet), regular exercise, maintaining a healthy weight, limiting alcohol, managing stress, and taking prescribed anti-hypertensive medications. It often has no symptoms, so regular monitoring is crucial.',
    keywords: ['hypertension', 'blood pressure', 'high bp', 'heart', 'cardiovascular'],
    category: 'Chronic Conditions',
    source: 'General Medical Knowledge'
  },
  {
    title: 'Asthma Management',
    content: 'Asthma is a condition in which your airways narrow and swell and may produce extra mucus, making breathing difficult. Management involves avoiding triggers (like pollen, dust mites, pet dander, or cold air), taking long-term control medications (inhaled corticosteroids), and keeping a quick-relief inhaler (like albuterol) for symptom flare-ups. Seek emergency help for severe shortness of breath that doesn\'t improve with the quick-relief inhaler.',
    keywords: ['asthma', 'breathing', 'wheezing', 'inhaler', 'albuterol', 'shortness of breath'],
    category: 'Chronic Conditions',
    source: 'General Medical Knowledge'
  },
  {
    title: 'First Aid: Minor Burns',
    content: 'For minor burns (first-degree or small second-degree burns), immediately cool the burn under cool (not cold) running water for 10 to 15 minutes or until the pain eases. Do not use ice. Apply a soothing lotion containing aloe vera. Cover the burn with a sterile gauze bandage loosely. Take an over-the-counter pain reliever if needed. Do not pop blisters. Seek medical care if the burn is large, on the face/hands, or shows signs of infection.',
    keywords: ['burn', 'first aid', 'hot', 'scald', 'blister'],
    category: 'First Aid',
    source: 'General Medical Knowledge'
  },
  {
    title: 'First Aid: Cuts and Scrapes',
    content: 'Wash your hands before treating a cut. Stop bleeding by applying gentle pressure with a clean cloth. Clean the wound with clear water; use mild soap to clean around the wound but not in it. Apply a thin layer of antibiotic ointment (like Neosporin) and cover with a sterile bandage. Change the bandage daily. Seek medical attention if the cut is deep, gaping, won\'t stop bleeding, or shows signs of infection (redness, swelling, pus).',
    keywords: ['cut', 'scrape', 'wound', 'bleeding', 'first aid', 'bandage'],
    category: 'First Aid',
    source: 'General Medical Knowledge'
  }
];

async function generateEmbeddings() {
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
    modelName: 'gemini-embedding-2'
  });

  return embeddings;
}

async function seedDatabase() {
  try {
    const embeddings = await generateEmbeddings();
    
    // Clear existing data
    await MedicalKnowledge.deleteMany({});
    console.log('Cleared existing medical knowledge data');

    console.log('Generating embeddings and saving records...');
    
    for (const item of knowledgeBase) {
      // Create a search text string to embed (combining title, content, and keywords)
      const textToEmbed = `${item.title}. ${item.content} Keywords: ${item.keywords.join(', ')}`;
      
      const embedding = await embeddings.embedQuery(textToEmbed);
      
      const record = new MedicalKnowledge({
        ...item,
        embedding
      });
      
      await record.save();
      console.log(`Saved: ${item.title}`);
    }
    
    console.log('Successfully seeded medical knowledge database!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
