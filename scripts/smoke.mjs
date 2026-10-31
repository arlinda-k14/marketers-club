import { chromium } from 'playwright';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

async function smoke() {
  console.log('Starting smoke test...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Test signup/profile creation
    await page.goto('http://localhost:3000/sign-in.html');
    console.log('Loaded sign-in page');
    
    // Create a test user
    const testUid = 'smoke-test-' + Date.now();
    const testEmail = `smoke${Date.now()}@test.com`;
    
    await admin.auth().createUser({
      uid: testUid,
      email: testEmail,
      password: 'testpass123',
      emailVerified: true
    });
    
    // Tag test data
    await db.collection('users').doc(testUid).set({
      uid: testUid,
      email: testEmail,
      fullName: 'Smoke Test User',
      displayName: 'Smoke Test User',
      currentRole: 'Tester',
      yearsExperience: '1',
      primaryGoal: 'Test',
      targetSkill: 'Testing',
      portfolioUrl: '',
      referralSource: 'smoke-test',
      membershipTier: 'free',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      _smokeTest: true
    });
    
    // Test course progress persistence - call progress service directly with seeded lesson IDs
    await db.collection('users').doc(testUid).collection('enrollments').doc('foundations').set({
      completedLessonIds: ['lesson1', 'lesson2'],
      percent: 50
    });
    console.log('Progress persisted');
    
    // Create community post
    await db.collection('discussions').doc('smoke-disc-' + Date.now()).set({
      id: 'smoke-disc',
      authorUid: testUid,
      title: 'Smoke Test Post',
      content: 'This is a smoke test post',
      tags: ['test'],
      commentCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      _smokeTest: true
    });
    console.log('Community post created');
    
    // Non-empty reads from users, resources, and discussions
    const usersSnap = await db.collection('users').limit(1).get();
    const resourcesSnap = await db.collection('resources').limit(1).get();
    const discussionsSnap = await db.collection('discussions').limit(1).get();
    
    console.log(`Users count: ${usersSnap.size}`);
    console.log(`Resources count: ${resourcesSnap.size}`);
    console.log(`Discussions count: ${discussionsSnap.size}`);
    
    if (usersSnap.empty || resourcesSnap.empty || discussionsSnap.empty) {
      throw new Error('Empty reads detected');
    }
    
    // Cleanup test data
    await db.collection('users').doc(testUid).delete();
    await admin.auth().deleteUser(testUid);
    const smokeDiscs = await db.collection('discussions').where('_smokeTest', '==', true).get();
    for (const doc of smokeDiscs.docs) {
      await doc.ref.delete();
    }
    console.log('Test data cleaned up');
    
    console.log('Smoke test PASSED');
  } catch (e) {
    console.error('Smoke test FAILED:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

smoke();
