'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Check, Image as ImageIcon, RotateCcw, X } from 'lucide-react'
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
        toast.success('Comprovante enviado')
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
      <Button onClick={handleOpen} variant="primary" size="lg" className="w-full">
        <Camera className="h-4 w-4" /> Registrar foto da entrega
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Foto do comprovante">
          <div className="w-full max-w-lg overflow-hidden rounded-t-2xl border border-line bg-surface shadow-pop sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="text-[15px] font-semibold text-fg">Comprovante de entrega</h3>
              <button type="button" onClick={handleClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-3 hover:bg-surface-2 hover:text-fg" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              {!capturedImage && !isCameraActive && (
                <div className="space-y-4">
                  <p className="text-center text-sm text-fg-2">Fotografe o item entregue ou o local da entrega.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={startCamera} variant="primary" size="lg"><Camera className="h-4 w-4" /> Câmera</Button>
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="lg"><ImageIcon className="h-4 w-4" /> Galeria</Button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                </div>
              )}

              {isCameraActive && (
                <div className="space-y-4">
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                    <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => { stopCamera() }} variant="outline" className="flex-1">Cancelar</Button>
                    <Button onClick={capturePhoto} className="flex-1"><Camera className="h-4 w-4" /> Capturar</Button>
                  </div>
                </div>
              )}

              {capturedImage && (
                <div className="space-y-4">
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (data URL) */}
                    <img src={capturedImage} alt="Foto capturada" className="h-full w-full object-contain" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={retakePhoto} variant="outline" className="flex-1" disabled={isUploading}><RotateCcw className="h-4 w-4" /> Refazer</Button>
                    <Button onClick={uploadPhoto} className="flex-1" isLoading={isUploading}>{!isUploading && <Check className="h-4 w-4" />} Enviar foto</Button>
                  </div>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  )
}
