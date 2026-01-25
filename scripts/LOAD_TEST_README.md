# Load Test Documentation

## Overview
A comprehensive load test has been created to verify the reel generator can handle 100 images with variable durations and transitions.

## Test Configuration
- **Images**: 100 data URL images (to avoid external dependencies)
- **Duration Pattern**: Each image has different duration (1000ms to 10900ms, increasing by 100ms each)
- **Transitions**: Cycling through fade, slide, zoom, none for each image transition
- **Music**: Minimal test audio included
- **Output**: MP4 video at 1080x1920 resolution

## Expected Results
- **Total Duration**: 644.5 seconds (10 minutes 44.5 seconds)
- **File Size**: Approximately 50-100MB (depending on quality settings)
- **Transitions**: 99 transitions total, following the cycling pattern

## Running the Load Test

1. Generate the video:
   ```bash
   npm run generate -- samples/load-test-config.json -o load-test-output.mp4
   ```

2. Verify results:
   ```bash
   node scripts/verify-load-test.mjs
   ```

## What Gets Tested
✅ Video duration calculation accuracy
✅ Large number of images processing
✅ Variable image durations
✅ Different transition types
✅ Memory usage with many images
✅ Text overlay rendering
✅ Audio integration
✅ Long-form video generation

## Manual Verification
After generation, manually verify:
- Transitions match the expected pattern
- Image durations increase progressively
- Text overlays display correctly
- Audio plays throughout the video

## Running the Load Test with Proper Timeout

For the 100-image load test, you'll need to set a longer timeout:

```bash
# Run load test with 16-minute timeout (944500ms)
npm run generate -- samples/load-test-config.json -o load-test-output.mp4 --timeout 944500
```

**Timeout Breakdown:**
- Expected video duration: 644.5 seconds (10.7 minutes)
- Encoding/processing buffer: 5 minutes
- Total recommended timeout: 16 minutes

## Alternative: Run in Background

For very long-running tests, you can run in the background:

```bash
# Run in background (will continue even if terminal disconnects)
nohup npm run generate -- samples/load-test-config.json -o load-test-output.mp4 --timeout 944500 &
```

Check progress:
```bash
tail -f nohup.out
```

## Troubleshooting Long-Running Tests

If the test still times out:
1. Increase timeout further: `--timeout 1200000` (20 minutes)
2. Check system resources (CPU, memory, disk space)
3. Monitor the development server logs
4. Ensure adequate system cooling for sustained encoding

## Expected Completion Time

- **100 images**: ~15-20 minutes total
- **System dependent**: Faster on SSDs, more CPU cores
- **Progress monitoring**: Check console output for frame encoding progress
