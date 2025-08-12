import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader"

/**
 * Creates imageIds for local or hosted DICOM files
 * 
 * @param {string} filePath - Path to the DICOM file (can be local or hosted URL)
 * @returns {string[]} An array of imageIds for the DICOM file
 */
export default async function createImageIdsAndCacheMetaData(filePath: string): Promise<string[]> {
  // Create a file URL for the DICOM file
  const imageId = `wadouri:${filePath}`
  
  return [imageId]
}