# DICOM Multi-Viewer

A modern, web-based DICOM image viewer built with React, TypeScript, and Cornerstone3D. This application allows you to view DICOM images with multiple synchronized viewports, providing a powerful tool for medical imaging analysis.

## 🚀 Features

### Core Functionality
- **Multi-Viewport Support**: Create and manage multiple DICOM viewers simultaneously
- **Real-time Synchronization**: Sync zoom and pan operations across multiple viewports
- **Interactive Tools**: Built-in zoom and pan tools for image navigation
- **Responsive Design**: Clean, modern UI with intuitive controls

### Viewer Controls
- **Zoom Control**: Mouse wheel zoom and right-click zoom functionality
- **Pan Control**: Left-click and drag to pan around the image
- **Sync Toggle**: Enable/disable synchronization between viewports
- **Dynamic Viewport Management**: Add and remove viewers on demand

## 🛠️ Installation

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dicom-reader
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` (or the port shown in the terminal)

## 📖 Usage

### Getting Started

1. **Launch the Application**: Start the development server and open the application in your browser
2. **Add Viewers**: Click the "Add Viewer" button to create new DICOM viewports
3. **Load Images**: The application comes with a pre-loaded sample DICOM image
4. **Navigate Images**: Use mouse controls to zoom and pan within each viewer

### Viewer Controls

- **Mouse Wheel**: Zoom in/out
- **Right Click + Drag**: Zoom with mouse movement
- **Left Click + Drag**: Pan around the image
- **Sync Checkbox**: Enable/disable synchronization with other viewers
- **Remove Button**: Delete individual viewers

### Synchronization

When synchronization is enabled:
- Zoom and pan operations are automatically synchronized across all synced viewports
- The "SYNC" indicator appears in the top-right corner of synced viewers
- Changes in one viewer are immediately reflected in all other synced viewers

## 🏗️ Project Structure

```
dicom-reader/
├── src/
│   ├── App.tsx              # Main application component
│   ├── Home.tsx             # Multi-viewer interface
│   ├── Viewer.tsx           # Individual DICOM viewer component
│   ├── lib/
│   │   ├── SyncManager.ts   # Viewport synchronization logic
│   │   └── createImageIdsAndCacheMetaData.ts
│   └── assets/              # Static assets
├── public/                  # Public assets
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

## 🔧 Configuration

### DICOM Image Source
The application currently uses a sample DICOM image. To use your own DICOM files:

1. Update the `DEFAULT_IMAGE_ID` constant in `src/Home.tsx`
2. Ensure your DICOM files are accessible via HTTP/HTTPS
3. Use the `wadouri:` protocol for local files or direct URLs

### Customization
- Modify viewer sizes in `src/Viewer.tsx` (currently 400x400 pixels)
- Adjust UI styling in the component files
- Customize synchronization behavior in `src/lib/SyncManager.ts`

