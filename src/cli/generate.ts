#!/usr/bin/env tsx

import { Command } from 'commander';
import { chromium } from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Utility function to click button with retry logic
async function clickButtonWithRetry(page: any, buttonText: string, maxRetries: number = 3, retryDelay: number = 5000): Promise<boolean> {
  // Try multiple variations of the button text
  const textVariations = [
    buttonText,
    buttonText.toLowerCase(),
    buttonText.toUpperCase(),
    buttonText.replace('&', 'and'),
    buttonText.replace('and', '&'),
  ];

  // Remove duplicates
  const uniqueVariations = [...new Set(textVariations)];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const text of uniqueVariations) {
      console.log(`🔍 Attempting to find and click button with text containing "${text}" (attempt ${attempt}/${maxRetries})...`);

      const buttonClicked = await page.evaluate((searchText: string) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const button = buttons.find(btn =>
          btn.textContent?.toLowerCase().includes(searchText.toLowerCase())
        );

        if (button && !button.disabled) {
          button.click();
          return true;
        }
        return false;
      }, text);

      if (buttonClicked) {
        console.log(`✅ Successfully clicked button with text containing "${text}"`);
        return true;
      }
    }

    if (attempt < maxRetries) {
      console.log(`⏳ Button not found or not clickable. Waiting ${retryDelay/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  console.error(`❌ Failed to find or click button with text variations of "${buttonText}" after ${maxRetries} attempts`);
  return false;
}

// Utility function to click button in modal with retry logic
async function clickModalButtonWithRetry(page: any, buttonText: string, maxRetries: number = 3, retryDelay: number = 5000): Promise<boolean> {
  // Try multiple variations of the button text
  const textVariations = [
    buttonText,
    buttonText.toLowerCase(),
    buttonText.toUpperCase(),
    buttonText.replace('&', 'and'),
    buttonText.replace('and', '&'),
  ];

  // Remove duplicates
  const uniqueVariations = [...new Set(textVariations)];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const text of uniqueVariations) {
      console.log(`🔍 Attempting to find and click button with text containing "${text}" in modal (attempt ${attempt}/${maxRetries})...`);

      const buttonClicked = await page.evaluate((searchText: string) => {
        const modal = document.querySelector('[role="dialog"]') || document.querySelector('.MuiDialog-root');
        if (!modal) return false;

        const buttons = Array.from(modal.querySelectorAll('button'));
        const button = buttons.find(btn =>
          btn.textContent?.toLowerCase().includes(searchText.toLowerCase())
        );

        if (button && !button.disabled) {
          button.click();
          return true;
        }
        return false;
      }, text);

      if (buttonClicked) {
        console.log(`✅ Successfully clicked button with text containing "${text}" in modal`);
        return true;
      }
    }

    if (attempt < maxRetries) {
      console.log(`⏳ Button not found in modal. Waiting ${retryDelay/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  console.error(`❌ Failed to find or click button with text variations of "${buttonText}" in modal after ${maxRetries} attempts`);
  return false;
}

// CLI program
const program = new Command();

program
  .name('reel-generator')
  .description('Generate video reels using browser automation')
  .version('1.0.0')
  .argument('<config>', 'Path to JSON config file')
  .option('-o, --output <file>', 'Output file path', 'output.mp4')
  .option('--keep-browser', 'Keep browser open after completion (for debugging)')
  .option('--show-browser', 'Show browser window during generation (not headless)')
  .option('-t, --timeout <ms>', 'Timeout for video generation in milliseconds', '300000')
  .action(async (configPath: string, options: { output: string; keepBrowser: boolean; showBrowser: boolean; timeout: string }) => {
    try {
      await generateReel(configPath, options.output, options.keepBrowser, options.showBrowser, parseInt(options.timeout));
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();

// Main generation function
async function generateReel(configPath: string, outputPath: string, keepBrowser: boolean = false, showBrowser: boolean = false, timeoutMs: number = 300000) {
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
    // Launch browser (headless for server environments unless --show-browser is specified)
    const isHeadless = !showBrowser;
    console.log(`🖥️  Launching browser (${isHeadless ? 'headless' : 'visible'})...`);
    browser = await chromium.launch({
      headless: isHeadless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-accelerated-video-decode'
      ]
    });

    const page = await browser.newPage();

    // Set up download handling - monitor both events and filesystem
    let downloadComplete = false;
    let downloadedFilePath = '';

    // Listen for download events (works in headless mode for some download types)
    page.on('download', async (download) => {
      console.log(`📥 Download started: ${download.suggestedFilename()}`);
      const downloadPath = path.join(downloadsDir, download.suggestedFilename());
      await download.saveAs(downloadPath);
      downloadedFilePath = downloadPath;
      downloadComplete = true;
      console.log(`✅ Download completed: ${download.suggestedFilename()}`);
    });

    // Also monitor downloads directory as fallback (for programmatic downloads)
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

    // Expose function to save blob data
    await page.exposeFunction('saveVideoBlob', async (blobData: string, filename: string) => {
      const buffer = Buffer.from(blobData, 'base64');
      const filepath = outputPath;
      await fs.writeFile(filepath, buffer);
      downloadedFilePath = filepath;
      downloadComplete = true;
      console.log(`✅ Video saved to: ${filepath}`);
    });

    // Inject script to handle downloads in headless mode
    await page.addScriptTag({
      content: `
        // Override the download function to capture blob data
        window.capturedBlob = null;
        window.capturedFilename = null;

        // Override the video generation download
        const originalCreateObjectURL = URL.createObjectURL;
        URL.createObjectURL = function(blob) {
          if (blob instanceof Blob && (blob.type.includes('video') || blob.type.includes('mp4') || blob.type.includes('webm'))) {
            window.capturedBlob = blob;
            console.log('🎥 Video blob captured for headless download');
          }
          return originalCreateObjectURL.apply(this, arguments);
        };

        // Override the download link click
        const originalAddEventListener = HTMLElement.prototype.addEventListener;
        HTMLElement.prototype.addEventListener = function(type, listener, options) {
          if (type === 'click' && this.tagName === 'A' && this.download) {
            const link = this;
            const handleClick = async function(e) {
              if (window.capturedBlob) {
                e.preventDefault();
                e.stopPropagation();

                // Convert blob to base64 and save via exposed function
                const reader = new FileReader();
                reader.onload = function() {
                  const arrayBuffer = reader.result;
                  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                  window.saveVideoBlob(base64, link.download);
                };
                reader.readAsArrayBuffer(window.capturedBlob);
                return false;
              }
              return listener.call(this, e);
            };
            return originalAddEventListener.call(this, type, handleClick, options);
          }
          return originalAddEventListener.call(this, type, listener, options);
        };
      `
    });

    // Listen for console messages to track progress
    page.on('console', (msg) => {
      const text = msg.text();

      if (text.includes('Error') || text.includes('error') || text.includes('Failed')) {
        console.error('❌ Page error:', text);
      } else if (text.includes('[Video] Using direct FFmpeg encoding')) {
        console.log('🎬 Starting video encoding...');
      } else if (text.includes('Video blob captured for headless download')) {
        console.log('📦 Video blob captured!');
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
    const importClicked = await clickButtonWithRetry(page, 'Import from JSON');
    if (!importClicked) {
      throw new Error('Could not find or click "Import from JSON" button - check if the web app loaded correctly');
    }

    // Wait for modal to open and debug what buttons are available
    console.log('⏳ Waiting for config import modal to open...');
    await page.waitForSelector('textarea', { timeout: 10000 });

    // Debug: log buttons in the modal
    const modalButtons = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]') || document.querySelector('.MuiDialog-root');
      if (modal) {
        const buttons = Array.from(modal.querySelectorAll('button'));
        return buttons.map(btn => ({
          text: btn.textContent?.trim(),
          disabled: btn.disabled,
          visible: btn.offsetWidth > 0 && btn.offsetHeight > 0
        }));
      }
      return [];
    });

    if (modalButtons.length > 0) {
      console.log('📋 Buttons found in modal:', modalButtons);
    } else {
      console.log('⚠️  No buttons found in modal yet, will retry...');
    }

    // Paste config into textarea
    await page.waitForSelector('textarea', { timeout: 10000 });
    await page.fill('textarea', configContent);

    // Click import confirmation button
    const importConfirmClicked = await clickButtonWithRetry(page, 'Import & Load');
    if (!importConfirmClicked) {
      throw new Error('Could not find or click import confirmation button - check if config is valid JSON');
    }

    // Wait for modal to close and images to be processed
    console.log('🖼️  Waiting for config import and image processing...');
    await page.waitForFunction(() => {
      // Wait for images to load
      const images = document.querySelectorAll('img');
      return images.length >= (window.config?.images?.length || 1) &&
             Array.from(images).every(img => img.complete && img.naturalHeight > 0);
    }, { timeout: 60000 });

    console.log('✅ Config imported and images loaded!');

    // Wait for "Preview & Generate" button to be enabled (indicates config loaded and images processed)
    console.log('🎬 Waiting for "Preview & Generate" button to be enabled...');
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const previewButton = buttons.find(btn => btn.textContent?.includes('Preview & Generate'));
      return previewButton && !previewButton.disabled;
    }, { timeout: 120000 }); // Give more time for images to load

    console.log('✅ Preview & Generate button is now enabled!');

    // Open preview modal
    console.log('🎬 Opening preview modal...');
    const previewClicked = await clickButtonWithRetry(page, 'Preview & Generate');
    if (!previewClicked) {
      throw new Error('Could not find or click "Preview & Generate" button - check if config was imported successfully');
    }

    // Wait for modal to open
    console.log('⏳ Waiting for preview modal to open...');
    await page.waitForFunction(() => {
      const modal = document.querySelector('[role="dialog"]') || document.querySelector('.MuiDialog-root');
      return modal && modal.querySelector('button') !== null;
    }, { timeout: 10000 });

    console.log('✅ Preview modal opened successfully!');

    // Start generation
    console.log('🎥 Starting video generation...');

    // Find and click "Generate MP4" button in the modal
    const buttonFound = await clickModalButtonWithRetry(page, 'Generate MP4');
    if (!buttonFound) {
      throw new Error('Could not find or click "Generate MP4" button in modal - check if preview modal opened correctly');
    }

    // Wait for download to complete
    console.log(`⏳ Waiting for video generation to complete (timeout: ${(timeoutMs/1000/60).toFixed(1)} minutes)...`);

    // Wait for the exposed function to be called
    let waitTime = 0;
    const checkInterval = 1000; // Check every second

    while (!downloadComplete && waitTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
    }

    if (!downloadComplete) {
      throw new Error(`Video generation did not complete within ${timeoutMs/1000/60} minute timeout`);
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