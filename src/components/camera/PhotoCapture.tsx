'use client'

import { useState, useRef, useCallback } from 'react'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface PhotoCaptureProps {
  pedidoId: string
  onPhotoSent?: (photoUrl: string) => void
  className?: string
}

export default function PhotoCapture({
  pedidoId,
  onPhotoSent,
  className = '',
}: PhotoCaptureProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Câmera traseira
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setIsCameraActive(true)
    } catch (error) {
      console.error('Erro ao acessar câmera:', error)
      toast.error('Não foi possível acessar a câmera')
    }
  }

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }, [])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Ajustar canvas para o tamanho do vídeo
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Desenhar frame do vídeo no canvas
    context.drawImage(video, 0, 0)

    // Converter para base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(imageData)
    stopCamera()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione apenas imagens')
      return
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    startCamera()
  }

  const uploadPhoto = async () => {
    if (!capturedImage) return

    setIsUploading(true)

    try {
      // Converter base64 para blob
      const response = await fetch(capturedImage)
      const blob = await response.blob()

      // Criar FormData
      const formData = new FormData()
      formData.append('foto', blob, `comprovante-${pedidoId}.jpg`)

      // Enviar para API
      const uploadResponse = await fetch(
        `/api/pedidos/${pedidoId}/comprovante`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const data = await uploadResponse.json()

      if (data.success) {
        toast.success('Comprovante enviado com sucesso!')
        onPhotoSent?.(data.data.fotoUrl)
        handleClose()
      } else {
        toast.error(data.error || 'Erro ao enviar comprovante')
      }
    } catch (error) {
      console.error('Erro ao enviar foto:', error)
      toast.error('Erro ao enviar comprovante')
    } finally {
      setIsUploading(false)
    }
  }

  const handleOpen = () => {
    setIsOpen(true)
    setCapturedImage(null)
  }

  const handleClose = () => {
    stopCamera()
    setCapturedImage(null)
    setIsOpen(false)
  }

  return (
    <div className={className}>
      {/* Botão para abrir */}
      <Button onClick={handleOpen} variant="primary" className="w-full">
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Tirar Foto do Comprovante
      </Button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Foto do Comprovante
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {!capturedImage && !isCameraActive && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Tire uma foto da entrega como comprovante
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Button onClick={startCamera} variant="primary">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Usar Câmera
                    </Button>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Galeria
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {isCameraActive && (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button
                      onClick={() => {
                        stopCamera()
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button onClick={capturePhoto} className="flex-1">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                      Capturar
                    </Button>
                  </div>
                </div>
              )}

              {capturedImage && (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <img
                      src={capturedImage}
                      alt="Foto capturada"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button
                      onClick={retakePhoto}
                      variant="outline"
                      className="flex-1"
                      disabled={isUploading}
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Tirar Outra
                    </Button>
                    <Button
                      onClick={uploadPhoto}
                      className="flex-1"
                      isLoading={isUploading}
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Enviar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Canvas oculto para captura */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  )
}
