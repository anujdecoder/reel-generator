#!/bin/bash
# Load Test Runner Script

echo "🎬 Starting Load Test with 100 Images"
echo "======================================"
echo ""

# Calculate recommended timeout (16 minutes)
TIMEOUT_MS=944500
TIMEOUT_MIN=$((TIMEOUT_MS / 1000 / 60))

echo "📊 Test Configuration:"
echo "  - Images: 100"
echo "  - Duration: 644.5 seconds expected"
echo "  - Timeout: ${TIMEOUT_MIN} minutes"
echo "  - Transitions: fade/slide/zoom/none (cycling)"
echo ""

echo "🚀 Starting video generation..."
echo "Command: npm run generate -- samples/load-test-config.json -o load-test-output.mp4 --timeout ${TIMEOUT_MS}"
echo ""

# Run the generation
npm run generate -- samples/load-test-config.json -o load-test-output.mp4 --timeout ${TIMEOUT_MS}

# Check if successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Video generation completed!"
    echo ""
    echo "🔍 Running verification..."
    node scripts/verify-load-test.mjs
else
    echo ""
    echo "❌ Video generation failed!"
    echo "Check the output above for error details."
    exit 1
fi
