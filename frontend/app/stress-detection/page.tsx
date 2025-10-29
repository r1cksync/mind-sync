"use client"

import { useState, useEffect, useRef } from "react"
import { useUser, useAuth } from "@clerk/nextjs"
import { motion } from "framer-motion"

// CSS classes for consistent button styling
const buttonBaseStyles = "font-medium py-2 px-6 rounded-lg transition-colors"
const primaryButtonStyles = `${buttonBaseStyles} bg-purple-600 hover:bg-purple-500 text-white`
const secondaryButtonStyles = `${buttonBaseStyles} bg-gray-700 hover:bg-gray-600 text-white`

export default function StressDetectionPage() {
  const { isSignedIn } = useUser()
  const { getToken, signOut } = useAuth()
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [stressLevel, setStressLevel] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Request camera access when the page loads
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 },
            facingMode: "user",
          },
        })
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play().catch((err) => console.error("Autoplay prevented:", err))
            }
          }
        }
      } catch (err) {
        setError("Failed to access camera: " + err.message)
      }
    }

    if (isSignedIn) {
      startCamera()
    }

    // Cleanup: Stop the camera stream when the component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isSignedIn])

  // Capture the image from the video feed
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current

      // Set canvas dimensions to match the video dimensions exactly
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight
      canvas.width = videoWidth
      canvas.height = videoHeight

      const ctx = canvas.getContext("2d")
      if (ctx) {
        // Draw the video frame to the canvas at full resolution
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight)
        const imageDataUrl = canvas.toDataURL("image/jpeg", 0.95) // Higher quality JPEG
        setCapturedImage(imageDataUrl)
        setStressLevel(null)
        setError(null)
      }
    }
  }

  // Convert the captured image (data URL) to a File object for sending to the backend
  const dataURLtoFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(",")
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  }

  // Handle the analysis confirmation
  const handleAnalyze = async () => {
    if (!capturedImage) {
      setError("No image captured")
      return
    }

    setLoading(true)
    setError(null)

    const imageFile = dataURLtoFile(capturedImage, "captured-image.jpg")
    const formData = new FormData()
    formData.append("image", imageFile)

    try {
      const token = await getToken()
      const response = await fetch("http://localhost:5001/predict-stress", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()
      if (response.ok) {
        setStressLevel(data.stress_level)
      } else {
        setError(data.error || "An error occurred while predicting stress level")
      }
    } catch (err) {
      setError("Failed to connect to the stress detection server")
    } finally {
      setLoading(false)
    }
  }

  // Handle retake
  const handleRetake = () => {
    setCapturedImage(null)
    setStressLevel(null)
    setError(null)
  }

  // Handle sign out
  const handleSignOut = async () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }
    await signOut()
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-xl text-gray-300"
        >
          Please sign in to access stress detection.
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center">
      <div className="background-layer-1"></div>
      <div className="background-layer-2"></div>
      <div className="background-layer-3"></div>
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center items-center mb-8 w-full relative"
        >
          <h1 className="text-4xl font-bold text-center">Stress Detection</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSignOut}
            className={secondaryButtonStyles}
          >
            Sign Out
          </motion.button>
        </motion.div>

        {/* Camera Feed and Capture */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-8 bg-[#1a1433] rounded-xl shadow-lg border border-[#2d2a4e] w-full flex flex-col items-center"
        >
          <h2 className="text-2xl font-semibold mb-6 text-center">Capture an Image for Stress Analysis</h2>

          {!capturedImage ? (
            <div className="flex flex-col items-center w-full">
              <div className="w-full flex justify-center mb-6">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full max-w-md rounded-lg border border-[#2d2a4e]"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={captureImage}
                className="btn-primary bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Capture Image
              </motion.button>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              <div className="w-full flex justify-center mb-6">
                <img
                  src={capturedImage || "/placeholder.svg"}
                  alt="Captured"
                  className="w-full max-w-md rounded-lg border border-[#2d2a4e]"
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-300 mb-6 text-center">Perform Analysis on This Image?</h3>
              <div className="flex justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="btn-primary bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <svg
                      className="animate-spin h-5 w-5 mr-3 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : null}
                  {loading ? "Analyzing..." : "Analyze Image"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRetake}
                  disabled={loading}
                  className="btn-secondary bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Retake Image
                </motion.button>
              </div>
            </div>
          )}

          {/* Hidden canvas for capturing the image */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Display Results */}
          {stressLevel !== null && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 p-6 bg-[#2d2a4e] rounded-lg border border-[#3b3665] w-full flex flex-col items-center"
            >
              <h3 className="text-lg font-semibold text-gray-300 text-center">Predicted Stress Level</h3>
              <p
                className={`text-2xl font-bold text-center ${
                  stressLevel >= 80 ? "text-red-400" : stressLevel >= 30 ? "text-yellow-400" : "text-green-400"
                }`}
              >
                {stressLevel.toFixed(2)}%
              </p>
              <p className="text-gray-400 text-center">(0% indicates no stress, 100% indicates extreme stress)</p>
            </motion.div>
          )}

          {/* Display Errors */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 p-6 bg-red-900 rounded-lg border border-red-800 w-full flex justify-center"
            >
              <p className="text-red-400 text-center">{error}</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
