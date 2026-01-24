#!/usr/bin/env tsx

import { Command } from 'commander';
import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// CLI program
const program = new Command();

program
  .name('reel-generator')
  .description('Generate video reels using headless browser automation')
  .version('1.0.0')
  .argument('<config>', 'Path to JSON config file')
  .option('-o, --output <file>', 'Output file path', 'output.mp4')
  .option('--no-headless', 'Run browser in non-headless mode (for debugging)')
  .option('--keep-browser', 'Keep browser open after completion (for debugging)')
  .action(async (configPath: string, options: { output: string; headless: boolean; keepBrowser: boolean }) => {
    try {
      await generateReel(configPath, options.output, options.headless, options.keepBrowser);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();

// Main generation function
async function generateReel(configPath: string, outputPath: string, headless: boolean = true, keepBrowser: boolean = false) {
  console.log(`🚀 Starting reel generator in ${headless ? 'headless' : 'visible'} mode...`);

  // Load config
  console.log('📄 Loading config from:', configPath);
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config = JSON.parse(configContent);

  console.log(`🎬 Generating reel with ${config.images?.length || 0} images`);

  // Start dev server
  console.log('🌐 Starting development server...');
  const serverProcess = exec('npm run dev -- --host 127.0.0.1 --port 5173', {
    cwd: path.join(process.cwd()),
  });

  // Wait for server to start and check if it's responding
  console.log('⏳ Waiting for server to start...');
  let serverReady = false;
  for (let i = 0; i < 30; i++) { // Wait up to 30 seconds
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
    // Launch browser
    console.log(`🖥️  Launching ${headless ? 'headless' : 'visible'} browser...`);
    browser = await puppeteer.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Set up progress tracking
    const progressBar = {
      update: (percentage: number, message: string) => {
        const width = 40;
        const filled = Math.round((percentage / 100) * width);
        const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
        process.stdout.write(`\rGeneration | ${bar} | ${percentage}% ${message}`);
      },
      complete: (message: string) => {
        progressBar.update(100, message);
        console.log();
      }
    };

    // Listen for console messages to track progress and errors
    page.on('console', (msg) => {
      const text = msg.text();

      // Only log errors and important progress messages
      if (text.includes('Error') || text.includes('error') || text.includes('Failed') ||
          text.includes('Cannot') || text.includes('CORS')) {
        console.error('❌ Page error:', text);
      } else if (text.includes('[Video] Using direct FFmpeg encoding')) {
        progressBar.update(10, 'Starting video generation...');
      } else if (text.includes('Generating frames:')) {
        const match = text.match(/Generating frames: (\d+)\/(\d+)/);
        if (match) {
          const [, current, total] = match;
          const percentage = Math.round((parseInt(current) / parseInt(total)) * 60) + 10;
          progressBar.update(percentage, `Rendering frames ${current}/${total}`);
        }
      } else if (text.includes('Converting to MP4') || text.includes('Encoding video...')) {
        progressBar.update(75, 'Encoding video...');
      } else if (text.includes('Conversion complete') || text.includes('Video complete')) {
        progressBar.update(95, 'Finalizing...');
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      console.error('❌ Page JavaScript error:', error.message);
    });

    // Navigate to app
    console.log('📱 Loading reel generator app...');
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });

    // Wait for app to load - look for any button first
    console.log('⏳ Waiting for app to load...');
    await page.waitForFunction(() => {
      return document.querySelector('button') !== null;
    }, { timeout: 20000 });

    // Debug: log all buttons on the page
    const buttons = await page.$$eval('button', btns => btns.map(btn => ({
      text: btn.textContent?.trim(),
      visible: btn.offsetWidth > 0 && btn.offsetHeight > 0
    })));
    console.log('Found buttons:', buttons.filter(btn => btn.visible));

    // Upload config
    console.log('📤 Uploading configuration...');

    // Click the config import button
    const importButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent?.includes('Import from JSON'));
    });
    if (importButton) {
      await importButton.click();
    } else {
      throw new Error('Could not find "Import from JSON" button');
    }

    // Wait for modal to open
    await page.waitForSelector('textarea', { timeout: 5000 });

    // Paste config into textarea
    await page.type('textarea', configContent);

    // Click import button
    const importConfirmButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent?.includes('Import & Load'));
    });
    if (importConfirmButton) {
      await importConfirmButton.click();
    } else {
      throw new Error('Could not find "Import & Load" button');
    }

    // Wait for modal to close and images to be processed
    console.log('🖼️  Waiting for config import and image processing...');
    progressBar.update(5, 'Processing config...');

    // Wait for the sidebar to show images (processed config)
    await page.waitForFunction(() => {
      // Look for image items in the sidebar or preview area
      return document.querySelectorAll('[data-testid="image-item"]').length >= 2 ||
             document.querySelectorAll('.image-preview img').length >= 2 ||
             document.querySelectorAll('img').length >= 2;
    }, { timeout: 60000 });

    progressBar.update(8, 'Images loaded');

    // Wait a bit more for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start generation
    console.log('🎥 Starting video generation...');
    progressBar.update(8, 'Initializing generation...');

    // Find and click generate button
    const generateButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent?.includes('Generate'));
    });

    if (!generateButton) {
      throw new Error('Could not find generate button');
    }

    await generateButton.click();

    // Wait for generation to complete
    console.log('⏳ Waiting for video generation to complete...');
    progressBar.update(10, 'Generating video...');

    let generationComplete = false;
    let downloadLink = null;

    try {
      // Wait for download link to appear or generation to fail
      const result = await page.waitForFunction(() => {
        // Check for download links
        const links = document.querySelectorAll('a');
        for (const link of links) {
          if (link.href.startsWith('blob:') || link.download) {
            return { type: 'success', link: link.href };
          }
        }

        // Check for error messages
        const errorElements = document.querySelectorAll('[role="alert"], .MuiAlert-root');
        if (errorElements.length > 0) {
          const errorText = Array.from(errorElements).map(el => el.textContent).join(' ');
          if (errorText.includes('Error') || errorText.includes('Failed') || errorText.includes('error')) {
            return { type: 'error', message: errorText };
          }
        }

        // Check if generate button is enabled again (indicates completion or failure)
        const buttons = document.querySelectorAll('button');
        const generateBtn = Array.from(buttons).find(btn => btn.textContent?.includes('Generate'));
        if (generateBtn && !generateBtn.disabled && generateBtn.textContent?.includes('Generate') && !generateBtn.textContent?.includes('Generating')) {
          // If button is "Generate Video" again and enabled, check for any download links
          const downloadLinks = Array.from(links).filter(link => link.href.startsWith('blob:') || link.download);
          if (downloadLinks.length > 0) {
            return { type: 'success', link: downloadLinks[0].href };
          }
        }

        return null; // Still processing
      }, { timeout: 120000 }); // 2 minutes for small videos

      if (result.type === 'error') {
        throw new Error(`Video generation failed: ${result.message}`);
      }

      generationComplete = true;
      downloadLink = result.link;
      progressBar.update(95, 'Video ready!');

    } catch (waitError) {
      console.log('⏰ Timeout waiting for generation completion, checking current state...');

      // Check if generation actually completed despite timeout
      const pageState = await page.evaluate(() => {
        const links = document.querySelectorAll('a');
        const blobLinks = Array.from(links).filter(link => link.href.startsWith('blob:') || link.download);

        const errors = Array.from(document.querySelectorAll('[role="alert"], .MuiAlert-root'))
          .map(el => el.textContent)
          .filter(text => text && (text.includes('Error') || text.includes('Failed')));

        return {
          blobLinks: blobLinks.map(link => link.href),
          errors
        };
      });

      if (pageState.blobLinks.length > 0) {
        console.log('✅ Found download link despite timeout');
        generationComplete = true;
        downloadLink = pageState.blobLinks[0];
      } else if (pageState.errors.length > 0) {
        throw new Error(`Video generation failed: ${pageState.errors.join(', ')}`);
      } else {
        throw new Error('Video generation timed out without completing');
      }
    }

    progressBar.update(98, 'Video ready!');

    if (!downloadLink) {
      throw new Error('Could not find download link');
    }

    const blobUrl = downloadLink;
    const filename = 'reel.mp4'; // Default filename

    // Download the blob
    console.log('💾 Downloading generated video...');
    progressBar.update(99, 'Downloading...');

    try {
      console.log('🔗 Found download link, downloading video...');

      // Use Puppeteer's page.evaluate with longer timeout to get the blob data
      const buffer = await page.evaluate(async (blobUrl) => {
        try {
          console.log('Fetching blob URL:', blobUrl.substring(0, 50) + '...');
          const response = await fetch(blobUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
          }

          const contentLength = response.headers.get('content-length');
          console.log('Content length:', contentLength);

          const arrayBuffer = await response.arrayBuffer();
          console.log('Downloaded', arrayBuffer.byteLength, 'bytes');
          return Array.from(new Uint8Array(arrayBuffer));
        } catch (error) {
          console.error('Error in page context:', error);
          throw error;
        }
      }, blobUrl);

      // Save to file
      const fileBuffer = Buffer.from(buffer);
      await fs.writeFile(outputPath, fileBuffer);

      progressBar.complete('Complete!');
      console.log(`✅ Video generated successfully: ${outputPath}`);
      console.log(`📊 File size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

      // Success - don't throw error for cleanup
      return;
    } catch (downloadError) {
      console.error('❌ Download failed:', downloadError);
      console.log('💡 This might be due to large file size or network issues.');
      console.log('💡 Try with a smaller video or check your internet connection.');
      throw new Error(`Failed to download video: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`);
    }

  } finally {
    if (browser && !keepBrowser) {
      console.log('🖥️  Closing browser...');
      await browser.close();
    } else if (keepBrowser) {
      console.log('🖥️  Browser left open for debugging (press Ctrl+C to exit)');
      console.log('🌐 Development server still running at http://127.0.0.1:5173');
      // Don't exit - let user manually close
      return;
    }

    // Stop dev server
    if (serverProcess) {
      console.log('🌐 Stopping development server...');
      serverProcess.kill('SIGTERM');
    }
  }
}