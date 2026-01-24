#!/usr/bin/env tsx

import { Command } from 'commander';
import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// CLI program
const program = new Command();

program
  .name('reel-generator')
  .description('Generate video reels using browser automation')
  .version('1.0.0')
  .argument('<config>', 'Path to JSON config file')
  .option('-o, --output <file>', 'Output file path', 'output.mp4')
  .option('--keep-browser', 'Keep browser open after completion (for debugging)')
  .action(async (configPath: string, options: { output: string; keepBrowser: boolean }) => {
    try {
      await generateReel(configPath, options.output, options.keepBrowser);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();

// Main generation function
// Main generation function
async function generateReel(configPath: string, outputPath: string, keepBrowser: boolean = false) {
  console.log('🚀 Starting reel generator automation...');

  // Load config
  console.log('📄 Loading config from:', configPath);
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config = JSON.parse(configContent);

  console.log(`🎬 Generating reel with ${config.images?.length || 0} images`);

  // Get downloads directory
  const downloadsDir = path.join(os.homedir(), 'Downloads');
  console.log('📁 Downloads directory:', downloadsDir);

  // Start dev server
  console.log('🌐 Starting development server...');
  const serverProcess = exec('npm run dev -- --host 127.0.0.1 --port 5173', {
    cwd: path.join(process.cwd()),
  });

  // Wait for server to start
  console.log('⏳ Waiting for server to start...');
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch('http://127.0.0.1:5173');
      if (response.ok) {
        serverReady = true;
        console.log('✅ Server is ready!');
        break;
      }
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (!serverReady) {
    throw new Error('Development server failed to start');
  }

  let browser;
  try {
    // Launch visible browser (not headless)
    console.log('🖥️  Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Always visible for downloads to work
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-accelerated-video-decode'
      ],
      defaultViewport: null,
      ignoreDefaultArgs: ['--disable-extensions']
    });

    const page = await browser.newPage();

    // Set up download monitoring
    let downloadComplete = false;
    let downloadedFilePath = '';

    // Monitor downloads directory for new video files
    const watcher = fs.watch(downloadsDir, (eventType, filename) => {
      if (eventType === 'rename' && filename && filename.endsWith('.mp4')) {
        const filePath = path.join(downloadsDir, filename);
        // Check if it's a recent video file
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const now = Date.now();
          const fileAge = now - stats.mtime.getTime();

          // If file was created in the last 2 minutes, it's likely our download
          if (fileAge < 120000) {
            console.log(`📥 Detected download: ${filename}`);
            downloadedFilePath = filePath;
            downloadComplete = true;
          }
        }
      }
    });

    // Listen for console messages to track progress
    page.on('console', (msg) => {
      const text = msg.text();

      if (text.includes('Error') || text.includes('error') || text.includes('Failed')) {
        console.error('❌ Page error:', text);
      } else if (text.includes('[Video] Using direct FFmpeg encoding')) {
        console.log('🎬 Starting video encoding...');
      } else if (text.includes('Generating frames:')) {
        const match = text.match(/Generating frames: (\d+)\/(\d+)/);
        if (match) {
          const [, current, total] = match;
          console.log(`🎨 Rendering frames: ${current}/${total}`);
        }
      } else if (text.includes('Converting to MP4') || text.includes('Encoding video...')) {
        console.log('📼 Encoding video...');
      } else if (text.includes('Conversion complete') || text.includes('Video complete')) {
        console.log('✅ Video encoding complete!');
      } else if (text.includes('Download the React DevTools')) {
        // Ignore React devtools message
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      console.error('❌ Page JavaScript error:', error.message);
    });

    // Navigate to app
    console.log('📱 Loading reel generator app...');
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });

    // Wait for app to load
    console.log('⏳ Waiting for app to load...');
    await page.waitForFunction(() => {
      return document.querySelector('button') !== null;
    }, { timeout: 20000 });

    // Upload config
    console.log('📤 Uploading configuration...');

    // Click the config import button
    const importButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent?.includes('Import from JSON'));
    });
    if (!importButton) {
      throw new Error('Could not find "Import from JSON" button');
    }
    await importButton.click();

    // Wait for modal to open
    await page.waitForSelector('textarea', { timeout: 5000 });

    // Paste config into textarea
    await page.type('textarea', configContent);

    // Click import button
    const importConfirmButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent?.includes('Import & Load'));
    });
    if (!importConfirmButton) {
      throw new Error('Could not find "Import & Load" button');
    }
    await importConfirmButton.click();

    // Wait for modal to close and images to be processed
    console.log('🖼️  Waiting for config import and image processing...');
    await page.waitForFunction(() => {
      // Wait for images to load
      const images = document.querySelectorAll('img');
      return images.length >= (window.config?.images?.length || 1) &&
             Array.from(images).every(img => img.complete && img.naturalHeight > 0);
    }, { timeout: 60000 });

    console.log('✅ Config imported and images loaded!');

    // Open preview modal
    console.log('🎬 Opening preview modal...');

    // Find and click "Preview & Generate" button
    const previewButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent?.includes('Preview & Generate'));
    });

    if (!previewButton) {
      throw new Error('Could not find "Preview & Generate" button');
    }

    await previewButton.click();

    // Wait for modal to open
    console.log('⏳ Waiting for preview modal to open...');
    await page.waitForFunction(() => {
      const modal = document.querySelector('[role="dialog"]');
      return modal && modal.querySelector('button') !== null;
    }, { timeout: 10000 });

    console.log('✅ Preview modal opened successfully!');

    // Start generation
    console.log('🎥 Starting video generation...');

    // Find and click generate button in the modal
    const generateButton = await page.evaluateHandle(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return null;

      const buttons = Array.from(modal.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent?.includes('Generate'));
    });

    if (!generateButton) {
      throw new Error('Could not find generate button in modal');
    }

    await generateButton.click();

    // Wait for download to complete
    console.log('⏳ Waiting for video download to complete...');

    // Wait for the file to appear in downloads
    let waitTime = 0;
    const maxWaitTime = 300000; // 5 minutes
    const checkInterval = 1000; // Check every second

    while (!downloadComplete && waitTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
    }

    if (!downloadComplete) {
      throw new Error('Video download did not complete within timeout');
    }

    // Stop watching downloads
    watcher.close();

    // Move the downloaded file to the desired output location
    console.log(`📁 Moving downloaded file to: ${outputPath}`);
    await fs.move(downloadedFilePath, outputPath, { overwrite: true });

    const stats = await fs.stat(outputPath);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log('✅ Video generated and saved successfully!');
    console.log(`📊 File size: ${fileSizeMB} MB`);
    console.log(`📍 Output: ${outputPath}`);

  } finally {
    if (browser && !keepBrowser) {
      console.log('🖥️  Closing browser...');
      await browser.close();
    } else if (keepBrowser) {
      console.log('🖥️  Browser left open for inspection');
      console.log('🌐 Development server still running at http://127.0.0.1:5173');
      return;
    }

    // Stop dev server
    if (serverProcess) {
      console.log('🌐 Stopping development server...');
      serverProcess.kill('SIGTERM');
    }
  }
}