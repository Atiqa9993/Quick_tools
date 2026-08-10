import { ReactNode } from 'react'

export type ToolConfig = {
  slug: string
  name: string
  desc: string
  badge: 'Free' | 'Pro'
  icon: string
  categoryLabel: string
  categoryIcon: string
  accepts: string
  instructions: { text: string }[]
  benefits: { icon: string; title: string; desc: string }[]
  showcase: { title: string; desc: string; tags: string[] }
}

export type CategoryConfig = {
  label: string
  icon: string
  tools: ToolConfig[]
}

const PDF_CATEGORY: CategoryConfig = {
  label: 'PDF Tools',
  icon: 'picture_as_pdf',
  tools: [
    {
      slug: 'compress-pdf',
      name: 'Compress PDF',
      desc: 'Reduce file size while optimizing for quality.',
      badge: 'Free',
      icon: 'compress',
      categoryLabel: 'PDF UTILITY',
      categoryIcon: 'picture_as_pdf',
      accepts: 'PDF files',
      instructions: [
        { text: 'Upload your PDF document using the dropzone.' },
        { text: 'Select compression level (Low, Medium, High).' },
        { text: 'Click compress to process and download.' }
      ],
      benefits: [
        { icon: 'bolt', title: 'Instant Speed', desc: 'Process files rapidly right in your browser.' },
        { icon: 'privacy_tip', title: 'Private & Secure', desc: 'Your files never leave your device.' },
        { icon: 'verified', title: 'Lossless', desc: 'Maintains readable quality.' },
        { icon: 'money_off', title: 'Free', desc: 'No limits on compression.' }
      ],
      showcase: {
        title: 'Perfect for Email Attachments',
        desc: 'Reduce PDF sizes by up to 90% so they can easily be sent via email or uploaded to web forms.',
        tags: ['Fast', 'Secure']
      }
    },
    {
      slug: 'pdf-to-word',
      name: 'PDF to Word',
      desc: 'Convert PDF files to editable Word documents.',
      badge: 'Free',
      icon: 'description',
      categoryLabel: 'PDF UTILITY',
      categoryIcon: 'picture_as_pdf',
      accepts: 'PDF files',
      instructions: [
        { text: 'Upload the PDF you want to convert.' },
        { text: 'Wait for the conversion process to complete.' },
        { text: 'Download your editable Word document (.docx).' }
      ],
      benefits: [
        { icon: 'bolt', title: 'Fast Conversion', desc: 'Converts complex PDFs quickly.' },
        { icon: 'format_paint', title: 'Retains Layout', desc: 'Keeps fonts and tables intact.' },
        { icon: 'privacy_tip', title: 'Secure', desc: 'Files are deleted after processing.' },
        { icon: 'edit_document', title: 'Fully Editable', desc: 'Edit text freely in Word.' }
      ],
      showcase: {
        title: 'Edit Existing Documents',
        desc: 'Need to change a typo in a PDF? Convert it to Word, fix it, and save it back as a PDF.',
        tags: ['Editable', 'Accurate']
      }
    },
    {
      slug: 'merge-pdf',
      name: 'Merge PDF',
      desc: 'Combine multiple PDFs into a single file.',
      badge: 'Free',
      icon: 'call_merge',
      categoryLabel: 'PDF UTILITY',
      categoryIcon: 'picture_as_pdf',
      accepts: 'Multiple PDF files',
      instructions: [
        { text: 'Select multiple PDF files to upload.' },
        { text: 'Drag and drop to reorder the files.' },
        { text: 'Click Merge to combine them into one.' }
      ],
      benefits: [
        { icon: 'reorder', title: 'Easy Sorting', desc: 'Drag to arrange file order.' },
        { icon: 'privacy_tip', title: 'Client-Side', desc: 'Merging happens locally.' },
        { icon: 'layers', title: 'No Limits', desc: 'Merge dozens of files at once.' },
        { icon: 'bolt', title: 'Instant', desc: 'No waiting in server queues.' }
      ],
      showcase: {
        title: 'Organize Your Documents',
        desc: 'Combine invoices, reports, or chapters into a single master PDF document.',
        tags: ['Client-Side', 'Fast']
      }
    },
    {
      slug: 'split-pdf',
      name: 'Split PDF',
      desc: 'Extract pages or split into separate files.',
      badge: 'Free',
      icon: 'call_split',
      categoryLabel: 'PDF UTILITY',
      categoryIcon: 'picture_as_pdf',
      accepts: 'PDF files',
      instructions: [
        { text: 'Upload your PDF document.' },
        { text: 'Select the pages or range to extract.' },
        { text: 'Download the separated PDF files.' }
      ],
      benefits: [
        { icon: 'bolt', title: 'Instant', desc: 'Process happens instantly.' },
        { icon: 'content_cut', title: 'Precision', desc: 'Extract exact page ranges.' },
        { icon: 'privacy_tip', title: 'Private', desc: 'Your data stays on your device.' },
        { icon: 'verified', title: 'Free', desc: 'No premium paywalls for splitting.' }
      ],
      showcase: {
        title: 'Break Down Large Documents',
        desc: 'Extract just the chapter you need, or separate a massive document into individual pages.',
        tags: ['Precise', 'Fast']
      }
    },
    {
      slug: 'pdf-to-text',
      name: 'OCR PDF',
      desc: 'Extract all text from scanned PDFs instantly. Handles multi-page documents, preserves paragraph structure and tables.',
      badge: 'Free',
      icon: 'description',
      categoryLabel: 'PDF UTILITY',
      categoryIcon: 'picture_as_pdf',
      accepts: 'PDF files',
      instructions: [
        { text: 'Upload your scanned PDF document using the dropzone above.' },
        { text: 'AI extracts text page-by-page, preserving structure and formatting.' },
        { text: 'Copy the extracted text or download as a .txt file instantly.' },
      ],
      benefits: [
        { icon: 'bolt', title: 'Multi-Page Support', desc: 'Process entire documents, not just single pages.' },
        { icon: 'privacy_tip', title: 'Private & Secure', desc: 'Your PDFs are never stored — processed and discarded.' },
        { icon: 'table_chart', title: 'Table Detection', desc: 'Preserves tables, lists, and paragraph structure.' },
        { icon: 'verified', title: 'Free Daily Quota', desc: 'Free for up to 5 pages per day, no account needed.' },
      ],
      showcase: {
        title: 'Digitize Any Scanned Document',
        desc: 'Whether it\'s a legal contract, medical form, or research paper — extract clean, structured text from any scanned PDF in seconds.',
        tags: ['Scanned PDFs', 'Native PDFs'],
      },
    }
  ]
}

const IMAGE_CATEGORY: CategoryConfig = {
  label: 'Image Tools',
  icon: 'image',
  tools: [
    {
      slug: 'image-compressor',
      name: 'Image Compressor',
      desc: 'Compress PNG, JPG, and SVG without losing quality.',
      badge: 'Free',
      icon: 'photo_size_select_small',
      categoryLabel: 'IMAGE UTILITY',
      categoryIcon: 'image',
      accepts: 'JPG, PNG, SVG',
      instructions: [
        { text: 'Drag & drop image files into the workspace.' },
        { text: 'Adjust the compression level.' },
        { text: 'Download the optimized images.' }
      ],
      benefits: [
        { icon: 'bolt', title: 'Fast Processing', desc: 'Optimizes images instantly.' },
        { icon: 'privacy_tip', title: 'Private', desc: 'No images are uploaded.' },
        { icon: 'high_quality', title: 'High Quality', desc: 'Smart lossy compression.' },
        { icon: 'verified', title: 'Free', desc: 'Optimize unlimited images.' }
      ],
      showcase: {
        title: 'Perfect for Web Developers',
        desc: 'Optimize your assets for the web to improve loading times and SEO performance.',
        tags: ['Web Ready', 'Fast']
      }
    },
    {
      slug: 'resize-image',
      name: 'Resize Image',
      desc: 'Change image dimensions in pixels or percentage.',
      badge: 'Free',
      icon: 'aspect_ratio',
      categoryLabel: 'IMAGE UTILITY',
      categoryIcon: 'image',
      accepts: 'JPG, PNG, WEBP',
      instructions: [
        { text: 'Upload the image you want to resize.' },
        { text: 'Enter new dimensions or a percentage.' },
        { text: 'Download the resized image.' }
      ],
      benefits: [
        { icon: 'bolt', title: 'Instant', desc: 'Resizes without waiting.' },
        { icon: 'aspect_ratio', title: 'Aspect Ratio', desc: 'Optionally lock proportions.' },
        { icon: 'privacy_tip', title: 'Private', desc: 'Processing happens locally.' },
        { icon: 'verified', title: 'Free', desc: 'No limits on resizing.' }
      ],
      showcase: {
        title: 'Create Social Media Assets',
        desc: 'Quickly scale your photos to fit Instagram, Twitter, and Facebook dimensions.',
        tags: ['Precise', 'Fast']
      }
    },
    {
      slug: 'background-remover',
      name: 'Background Remover',
      desc: 'AI-powered background removal for photos.',
      badge: 'Pro',
      icon: 'person_remove',
      categoryLabel: 'IMAGE UTILITY',
      categoryIcon: 'image',
      accepts: 'JPG, PNG',
      instructions: [
        { text: 'Upload an image with a clear subject.' },
        { text: 'Our AI will automatically detect and remove the background.' },
        { text: 'Download your image with a transparent background.' }
      ],
      benefits: [
        { icon: 'auto_awesome', title: 'AI Powered', desc: 'Smart subject detection.' },
        { icon: 'bolt', title: 'Fast', desc: 'Removes backgrounds in seconds.' },
        { icon: 'high_quality', title: 'Clean Edges', desc: 'Handles hair and fur well.' },
        { icon: 'download', title: 'PNG Output', desc: 'Saves with transparency.' }
      ],
      showcase: {
        title: 'Perfect for E-Commerce',
        desc: 'Create clean product shots for your online store by removing distracting backgrounds instantly.',
        tags: ['AI Powered', 'Clean']
      }
    },
    {
      slug: 'image-converter',
      name: 'Image Converter',
      desc: 'Convert any image between JPG, PNG, WEBP, GIF, and BMP without losing quality.',
      badge: 'Free',
      icon: 'sync_alt',
      categoryLabel: 'IMAGE UTILITY',
      categoryIcon: 'image',
      accepts: 'JPG, PNG, WEBP, HEIC, BMP, GIF',
      instructions: [
        { text: 'Upload the image you want to convert.' },
        { text: 'Select your desired output format (e.g. WEBP, PNG, JPG).' },
        { text: 'Download the converted image instantly in high quality.' }
      ],
      benefits: [
        { icon: 'high_quality', title: 'Lossless Conversion', desc: 'Maintains the original image quality.' },
        { icon: 'bolt', title: 'Fast', desc: 'Converts your images in seconds.' },
        { icon: 'category', title: 'Universal Formats', desc: 'Supports all major image formats.' },
        { icon: 'verified', title: 'Free', desc: 'No limits on the number of conversions.' }
      ],
      showcase: {
        title: 'Universal Format Conversion',
        desc: 'Easily convert next-gen formats like WEBP to standard JPGs, or turn your JPEGs into transparent-ready PNGs for professional editing.',
        tags: ['All Formats', 'High Quality']
      }
    },
    {
      slug: 'image-to-text',
      name: 'Image to Text',
      desc: 'Extract printed and handwritten text from any image using AI-powered OCR.',
      badge: 'Pro',
      icon: 'document_scanner',
      categoryLabel: 'IMAGE UTILITY',
      categoryIcon: 'image',
      accepts: 'JPG, PNG, WEBP, HEIC, BMP',
      instructions: [
        { text: 'Upload a photo or screenshot containing text.' },
        { text: 'Our AI scans for both printed and handwritten text.' },
        { text: 'Copy the extracted text or export as .txt or PDF.' }
      ],
      benefits: [
        { icon: 'auto_awesome', title: 'AI Powered', desc: 'Local AI reads printed & handwritten text — no cloud upload.' },
        { icon: 'translate', title: '50+ Languages', desc: 'Works with English, Arabic, Hindi, Urdu & more.' },
        { icon: 'table_chart', title: 'Smart Structure', desc: 'Preserves tables, lists, and formatting.' },
        { icon: 'verified', title: 'High Accuracy', desc: '99%+ accuracy on clear images.' }
      ],
      showcase: {
        title: 'Digitize Any Document',
        desc: 'Turn photos of receipts, whiteboards, book pages, or handwritten notes into editable, searchable text in seconds.',
        tags: ['Printed + Handwritten', 'AI Powered']
      }
    },
    {
      slug: 'image-to-pdf',
      name: 'Image to PDF',
      desc: 'Convert one or more images into a single high-quality PDF. Maintains original resolution and fits images perfectly to pages.',
      badge: 'Pro',
      icon: 'imagesmode',
      categoryLabel: 'IMAGE UTILITY',
      categoryIcon: 'image',
      accepts: 'JPG, PNG, WEBP',
      instructions: [
        { text: 'Upload your images by dragging them into the workspace or using the selector.' },
        { text: 'Images are automatically fitted to A4 pages while preserving aspect ratio.' },
        { text: 'Click the button to generate and download your PDF instantly.' },
      ],
      benefits: [
        { icon: 'bolt', title: 'Instant Processing', desc: 'PDF is created client-side — no upload, no waiting.' },
        { icon: 'privacy_tip', title: 'Fully Private', desc: 'Everything happens in your browser. Zero server contact.' },
        { icon: 'high_quality', title: 'Lossless Quality', desc: 'Original image resolution is preserved in the PDF.' },
        { icon: 'merge', title: 'Multi-Image', desc: 'Combine up to 20 images into a single PDF document.' },
      ],
      showcase: {
        title: 'Perfect for Reports & Portfolios',
        desc: 'Compile photos, screenshots, and scanned pages into professional PDF documents. Uses client-side jsPDF for instant, private processing.',
        tags: ['Client-Side', 'No Upload'],
      },
    }
  ]
}

const TEXT_CATEGORY: CategoryConfig = {
  label: 'Text Tools',
  icon: 'text_fields',
  tools: [
    {
      slug: 'word-counter',
      name: 'Word Counter',
      desc: 'Count words, characters, and reading time.',
      badge: 'Free',
      icon: 'pin',
      categoryLabel: 'TEXT TOOLS',
      categoryIcon: 'text_fields',
      accepts: 'Text input',
      instructions: [
        { text: 'Paste or type your text into the editor.' },
        { text: 'View real-time word and character counts.' },
        { text: 'Check the estimated reading time.' }
      ],
      benefits: [
        { icon: 'bolt', title: 'Real-time', desc: 'Updates as you type.' },
        { icon: 'analytics', title: 'Detailed Stats', desc: 'Counts spaces, paragraphs, and reading time.' },
        { icon: 'privacy_tip', title: 'Private', desc: 'Text never leaves your browser.' },
        { icon: 'verified', title: 'Free', desc: 'Completely free to use.' }
      ],
      showcase: {
        title: 'Meet Your Essay Limits',
        desc: 'Ensure your essays, articles, and tweets meet exact length requirements without guessing.',
        tags: ['Real-time', 'Private']
      }
    },
    {
      slug: 'case-converter',
      name: 'Case Converter',
      desc: 'Toggle between uppercase, lowercase, and title case.',
      badge: 'Free',
      icon: 'format_letter_spacing',
      categoryLabel: 'TEXT TOOLS',
      categoryIcon: 'text_fields',
      accepts: 'Text input',
      instructions: [
        { text: 'Paste your text into the editor.' },
        { text: 'Click the desired case format button.' },
        { text: 'Copy the converted text.' }
      ],
      benefits: [
        { icon: 'bolt', title: 'Instant', desc: 'Converts text immediately.' },
        { icon: 'text_format', title: 'Multiple Formats', desc: 'UPPER, lower, Title Case, camelCase.' },
        { icon: 'privacy_tip', title: 'Private', desc: 'Happens locally in browser.' },
        { icon: 'content_copy', title: 'Easy Copy', desc: 'One-click copy to clipboard.' }
      ],
      showcase: {
        title: 'Fix Formatting Errors',
        desc: 'Accidentally typed a paragraph with Caps Lock on? Fix it instantly with one click.',
        tags: ['Fast', 'Private']
      }
    },
    {
      slug: 'remove-line-breaks',
      name: 'Remove Line Breaks',
      desc: 'Clean up text by removing extra spacing and breaks.',
      badge: 'Free',
      icon: 'wrap_text',
      categoryLabel: 'TEXT TOOLS',
      categoryIcon: 'text_fields',
      accepts: 'Text input',
      instructions: [
        { text: 'Paste your messy text into the editor.' },
        { text: 'Choose to remove all breaks or format into paragraphs.' },
        { text: 'Copy the cleaned up text.' }
      ],
      benefits: [
        { icon: 'bolt', title: 'Instant', desc: 'Cleans text immediately.' },
        { icon: 'format_align_left', title: 'Smart Formatting', desc: 'Preserves intended paragraphs.' },
        { icon: 'privacy_tip', title: 'Private', desc: 'Happens locally in browser.' },
        { icon: 'content_copy', title: 'Easy Copy', desc: 'One-click copy to clipboard.' }
      ],
      showcase: {
        title: 'Clean PDF Copies',
        desc: 'Perfect for fixing text copied from PDFs that has annoying line breaks in the middle of sentences.',
        tags: ['Smart Format', 'Private']
      }
    },
    {
      slug: 'bulk-ocr',
      name: 'Bulk OCR',
      desc: 'Upload up to 50 images and extract text from all of them in one batch. Sequential processing with live progress tracking.',
      badge: 'Pro',
      icon: 'inventory_2',
      categoryLabel: 'TEXT TOOLS',
      categoryIcon: 'text_fields',
      accepts: 'JPG, PNG, WEBP',
      instructions: [
        { text: 'Upload up to 50 image files by dragging or selecting them.' },
        { text: 'Each image is processed sequentially with real-time progress updates.' },
        { text: 'Download all extracted text as a single combined .txt file.' },
      ],
      benefits: [
        { icon: 'bolt', title: 'Batch Processing', desc: 'Process up to 50 images in a single batch operation.' },
        { icon: 'privacy_tip', title: 'Live Progress', desc: 'Watch real-time progress as each file is processed.' },
        { icon: 'merge', title: 'Combined Output', desc: 'All results merged into one clean, labeled text file.' },
        { icon: 'verified', title: 'Pro Feature', desc: 'Unlimited batch processing with a QuickTools Pro plan.' },
      ],
      showcase: {
        title: 'Save Hours of Manual Data Entry',
        desc: 'Turn stacks of handwritten notes, receipts, or forms into digital text in minutes instead of hours. Perfect for clinics, offices, and research teams.',
        tags: ['50 Pages/Batch', 'Pro Plan'],
      },
    }
  ]
}

const CONVERTER_CATEGORY: CategoryConfig = {
  label: 'Converters',
  icon: 'swap_horiz',
  tools: [
    {
      slug: 'json-to-csv',
      name: 'JSON to CSV/Excel',
      desc: 'Convert structured data for spreadsheet software.',
      badge: 'Free',
      icon: 'data_object',
      categoryLabel: 'CONVERTERS',
      categoryIcon: 'swap_horiz',
      accepts: 'JSON files or text',
      instructions: [
        { text: 'Paste JSON data or upload a .json file.' },
        { text: 'Our tool automatically flattens nested objects.' },
        { text: 'Download the resulting .csv file.' }
      ],
      benefits: [
        { icon: 'bolt', title: 'Instant', desc: 'Converts instantly in browser.' },
        { icon: 'account_tree', title: 'Smart Flattening', desc: 'Handles nested JSON structures.' },
        { icon: 'privacy_tip', title: 'Private', desc: 'Data is not sent to any server.' },
        { icon: 'table_view', title: 'Excel Ready', desc: 'Outputs standard CSV format.' }
      ],
      showcase: {
        title: 'Perfect for Data Analysts',
        desc: 'Easily bring API responses and database dumps into Excel or Google Sheets for analysis.',
        tags: ['Robust', 'Fast']
      }
    },
    {
      slug: 'unit-converter',
      name: 'Unit Converter',
      desc: 'Length, weight, area, and volume conversions.',
      badge: 'Free',
      icon: 'straighten',
      categoryLabel: 'CONVERTERS',
      categoryIcon: 'swap_horiz',
      accepts: 'Numeric input',
      instructions: [
        { text: 'Select the category (Length, Weight, etc.).' },
        { text: 'Enter the value and select the source unit.' },
        { text: 'View the converted result instantly.' }
      ],
      benefits: [
        { icon: 'bolt', title: 'Real-time', desc: 'Updates as you type.' },
        { icon: 'calculate', title: 'Accurate', desc: 'High-precision mathematical conversions.' },
        { icon: 'privacy_tip', title: 'Private', desc: 'Works entirely offline/in-browser.' },
        { icon: 'swap_horiz', title: 'Two-way', desc: 'Swap units with one click.' }
      ],
      showcase: {
        title: 'Everyday Utility',
        desc: 'Quickly convert between Imperial and Metric systems for cooking, travel, or homework.',
        tags: ['Accurate', 'Fast']
      }
    },
    {
      slug: 'currency-converter',
      name: 'Currency Converter',
      desc: 'Real-time exchange rates for global currencies.',
      badge: 'Free',
      icon: 'payments',
      categoryLabel: 'CONVERTERS',
      categoryIcon: 'swap_horiz',
      accepts: 'Numeric input',
      instructions: [
        { text: 'Enter the amount you wish to convert.' },
        { text: 'Select your base currency and target currency.' },
        { text: 'View the up-to-date conversion rate.' }
      ],
      benefits: [
        { icon: 'sync', title: 'Live Rates', desc: 'Rates updated daily from global markets.' },
        { icon: 'public', title: '150+ Currencies', desc: 'Supports all major world currencies.' },
        { icon: 'swap_horiz', title: 'Two-way', desc: 'Easily swap base and target currencies.' },
        { icon: 'verified', title: 'Free', desc: 'Completely free to use.' }
      ],
      showcase: {
        title: 'Travel & Business',
        desc: 'Perfect for travelers checking prices or businesses invoicing international clients.',
        tags: ['Live Data', 'Global']
      }
    },
    {
      slug: 'qr-code-generator',
      name: 'QR Code Generator',
      desc: 'Create custom QR codes for links, text, or WiFi.',
      badge: 'Free',
      icon: 'qr_code_2',
      categoryLabel: 'CONVERTERS',
      categoryIcon: 'swap_horiz',
      accepts: 'Text or URL',
      instructions: [
        { text: 'Select the type of QR code (URL, Text, WiFi).' },
        { text: 'Enter your information.' },
        { text: 'Download the generated QR code image.' }
      ],
      benefits: [
        { icon: 'bolt', title: 'Instant Generation', desc: 'Creates code instantly.' },
        { icon: 'palette', title: 'Customizable', desc: 'Change colors and add logos.' },
        { icon: 'high_quality', title: 'High Resolution', desc: 'Download in SVG or high-res PNG.' },
        { icon: 'verified', title: 'No Expiry', desc: 'Generated codes never expire.' }
      ],
      showcase: {
        title: 'Marketing & Menus',
        desc: 'Create scannable links for restaurant menus, business cards, or event posters.',
        tags: ['High Res', 'Free']
      }
    }
  ]
}

export const appCategories = [PDF_CATEGORY, IMAGE_CATEGORY, TEXT_CATEGORY, CONVERTER_CATEGORY]
export const allToolsConfig: Record<string, ToolConfig> = appCategories.reduce((acc, cat) => {
  cat.tools.forEach(tool => {
    acc[tool.slug] = tool
  })
  return acc
}, {} as Record<string, ToolConfig>)
