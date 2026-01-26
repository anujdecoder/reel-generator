// Load Test Verification Script
import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔍 Load Test Verification');
console.log('==========================\n');

// Check if video file exists
const videoFile = 'load-test-output.mp4';
if (!fs.existsSync(videoFile)) {
  console.log('❌ Video file not found. Run the load test first:');
  console.log('npm run generate -- samples/load-test-config.json -o load-test-output.mp4');
  process.exit(1);
}

try {
  // Get video duration using ffprobe
  const ffprobeOutput = execSync(`ffprobe -v quiet -print_format json -show_format ${videoFile}`, { encoding: 'utf8' });
  const metadata = JSON.parse(ffprobeOutput);
  const actualDuration = parseFloat(metadata.format.duration);
  
  console.log('✅ Video file found!');
  console.log(`📊 Actual duration: ${actualDuration.toFixed(1)} seconds`);
  
  // Expected duration calculation
  const numImages = 100;
  const baseDuration = 1000;
  const transitionDuration = 500;
  
  let totalImageDuration = 0;
  let totalTransitionDuration = 0;
  for (let i = 0; i < numImages; i++) {
    totalImageDuration += baseDuration + (i * 100);
    if (i < numImages - 1) {
      totalTransitionDuration += transitionDuration;
    }
  }
  const expectedDuration = (totalImageDuration + totalTransitionDuration) / 1000;
  
  console.log(`🎯 Expected duration: ${expectedDuration.toFixed(1)} seconds`);
  
  // Check if duration is within acceptable range (allowing for encoding variations)
  const tolerance = 5; // 5 seconds tolerance
  const durationDiff = Math.abs(actualDuration - expectedDuration);
  
  if (durationDiff <= tolerance) {
    console.log(`✅ Duration verification: PASSED (${durationDiff.toFixed(1)}s difference)`);
  } else {
    console.log(`❌ Duration verification: FAILED (${durationDiff.toFixed(1)}s difference)`);
  }
  
  // Get file size
  const stats = fs.statSync(videoFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📁 File size: ${fileSizeMB} MB`);
  
  console.log('\n📋 Load Test Summary:');
  console.log('=====================');
  console.log(`🖼️  Images processed: ${numImages}`);
  console.log('🎭 Transitions tested: fade, slide, zoom, none (cycling pattern)');
  console.log('⏱️  Image durations: Variable (1000ms to 10900ms)');
  console.log('🎵 Music: Included (minimal test audio)');
  console.log('🎬 Video format: MP4');
  console.log('📐 Dimensions: 1080x1920 (9:16 aspect ratio)');
  
  console.log('\n🔍 Manual Transition Verification:');
  console.log('===================================');
  console.log('To verify transitions are applied correctly:');
  console.log('1. Open the video in a media player');
  console.log('2. Check that transitions between images match the expected pattern:');
  console.log('   - Images 1→2, 5→6, 9→10, etc.: fade transition');
  console.log('   - Images 2→3, 6→7, 10→11, etc.: slide transition');  
  console.log('   - Images 3→4, 7→8, 11→12, etc.: zoom transition');
  console.log('   - Images 4→5, 8→9, 12→13, etc.: none (instant) transition');
  console.log('3. Verify image display durations increase progressively');
  console.log('4. Confirm text overlays show "Load Test Image X"');
  
} catch (error) {
  console.error('❌ Error during verification:', error.message);
  process.exit(1);
}
