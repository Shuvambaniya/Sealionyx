'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  FileSignature,
  AlertCircle, 
  CheckCircle,
  Copy,
  Download,
  RefreshCw,
  Upload,
  ExternalLink,
  Image,
  Film,
  FileText,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { createBrowserClient } from '@/lib/supabase'
import { sealContent, sealImageEmbedded, getMyStatus } from '@/lib/api'
import { downloadJson, copyToClipboard } from '@/lib/utils'
import type { SealedBundle } from '@/types'

const AI_MODELS = [
  { value: '', label: 'Select AI Model' },
  { value: 'GPT-4', label: 'GPT-4' },
  { value: 'GPT-4o', label: 'GPT-4o' },
  { value: 'GPT-3.5', label: 'GPT-3.5' },
  { value: 'Claude 3.5 Sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'Claude 3 Opus', label: 'Claude 3 Opus' },
  { value: 'Claude 3 Haiku', label: 'Claude 3 Haiku' },
  { value: 'Gemini 1.5 Pro', label: 'Gemini 1.5 Pro' },
  { value: 'Gemini 1.5 Flash', label: 'Gemini 1.5 Flash' },
  { value: 'Gemini Ultra', label: 'Gemini Ultra' },
  { value: 'Llama 3', label: 'Llama 3' },
  { value: 'Llama 2', label: 'Llama 2' },
  { value: 'Mistral Large', label: 'Mistral Large' },
  { value: 'Mistral Medium', label: 'Mistral Medium' },
  { value: 'DALL-E 3', label: 'DALL-E 3' },
  { value: 'Midjourney', label: 'Midjourney' },
  { value: 'Stable Diffusion', label: 'Stable Diffusion' },
  { value: 'Sora', label: 'Sora' },
  { value: 'Other', label: 'Other' },
]

export default function SealPage() {
  const [title, setTitle] = useState('')
  const [modelName, setModelName] = useState('')
  const [customModelName, setCustomModelName] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [provisioned, setProvisioned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SealedBundle | null>(null)
  const [copied, setCopied] = useState(false)
  const [attachedFile, setAttachedFile] = useState<{name: string, type: string, data: string} | null>(null)
  const [sealedImage, setSealedImage] = useState<{data: string, filename: string, info: any} | null>(null)

  const supabase = createBrowserClient()

  useEffect(() => {
    checkUserStatus()
  }, [])

  const checkUserStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const statusRes = await getMyStatus(session.access_token)
      setProvisioned(statusRes.data?.provisioned || false)
    } catch (err) {
      console.error('Failed to check status:', err)
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    // Only allow images and videos
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Please upload an image or video file.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setAttachedFile({
        name: file.name,
        type: file.type,
        data: base64
      })
      setError(null)
    }
    reader.onerror = () => {
      setError('Failed to read file')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSeal = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!attachedFile) {
      setError('Please upload an image or video to seal')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setSealedImage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Determine final model name
      const finalModelName = modelName === 'Other' ? customModelName : modelName

      // Use embedded sealing for images
      if (attachedFile.type.startsWith('image/')) {
        // Use embedded seal endpoint - seal is embedded directly in image
        const response = await sealImageEmbedded(session.access_token, {
          image_data: attachedFile.data,
          image_filename: attachedFile.name,
          image_type: attachedFile.type,
          model_name: finalModelName || undefined,
          title: title || undefined,
        })

        if (response.error) {
          setError(response.error)
        } else if (response.data?.sealed_image) {
          setSealedImage({
            data: response.data.sealed_image,
            filename: response.data.sealed_filename || 'sealed-image',
            info: response.data.seal_info
          })
        }
      } else {
        // For videos, use regular seal endpoint - creates bundle.json
        const fileData = {
          text: null,
          file: {
            name: attachedFile.name,
            type: attachedFile.type,
            data: attachedFile.data
          }
        }
        const contentToSeal = JSON.stringify(fileData)
        const finalContentType = 'video'

        const response = await sealContent(session.access_token, {
          content: contentToSeal,
          content_type: finalContentType,
          model_name: finalModelName || undefined,
          title: title || undefined,
        })

        if (response.error) {
          setError(response.error)
        } else if (response.data?.bundle) {
          setResult(response.data.bundle)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seal content')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (result) {
      await copyToClipboard(JSON.stringify(result, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    if (result) {
      downloadJson(result, `sealed-bundle-${result.bundle_id || 'content'}.json`)
    }
  }

  const handleReset = () => {
    setTitle('')
    setModelName('')
    setCustomModelName('')
    setAttachedFile(null)
    setResult(null)
    setSealedImage(null)
    setError(null)
  }

  // Download sealed image
  const handleDownloadSealedImage = () => {
    if (sealedImage) {
      const link = document.createElement('a')
      link.href = sealedImage.data
      link.download = sealedImage.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (checkingStatus) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    )
  }

  if (!provisioned) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert className="bg-warning/10 border-warning/25">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Certificate Required</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span className="text-muted-foreground">You need to provision a certificate before you can seal content.</span>
            <Link href="/certificate">
              <Button size="sm" className="ml-4">Get Certificate</Button>
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Success state for embedded image seal
  if (sealedImage) {
    return (
      <div>
        <div className="mb-8 max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-2">Image Sealed</h1>
          <p className="text-muted-foreground">
            Your AI-generated image has been cryptographically sealed with an embedded signature.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="security-card">
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">Embedded Seal Complete</h2>
                <p className="text-sm text-muted-foreground">The signature is embedded directly in the image file</p>
              </div>
            </div>

            {/* Sealed Image Preview */}
            <div className="mb-6">
              <label className="text-sm font-medium text-muted-foreground">Sealed Image</label>
              <div className="mt-2 border border-border rounded-lg p-4 bg-muted/30">
                <img 
                  src={sealedImage.data} 
                  alt="Sealed" 
                  className="max-h-64 mx-auto rounded"
                />
                <p className="text-center text-sm text-muted-foreground mt-2">
                  {sealedImage.filename}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {sealedImage.info?.model_name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">AI Model</label>
                    <p className="mt-1">{sealedImage.info.model_name}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Format</label>
                  <p className="mt-1">{sealedImage.info?.format || 'Image'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Content Hash (SHA-256 of pixels)</label>
                <code className="block text-sm font-mono bg-muted px-3 py-2 rounded mt-1 break-all">
                  {sealedImage.info?.content_hash}
                </code>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Sealed At</label>
                <p className="mt-1">{sealedImage.info?.sealed_at}</p>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-medium text-sm mb-2">How Embedded Sealing Works</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>The cryptographic signature is stored in the image's EXIF metadata</li>
                  <li>Anyone can verify the image without needing a separate bundle.json file</li>
                  <li>The hash is computed from pixel data, so it survives metadata changes</li>
                  <li>Share the sealed image directly - the proof travels with it</li>
                </ul>
              </div>
            </div>

            <div className="border-t border-border my-6" />

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleDownloadSealedImage}>
                <Download className="h-4 w-4 mr-2" />
                Download Sealed Image
              </Button>
              <Button variant="outline" asChild>
                <Link href="/verify">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Verify Now
                </Link>
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                Seal Another
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success state for bundle.json
  if (result) {
    return (
      <div>
        <div className="mb-8 max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-2">Content Sealed</h1>
          <p className="text-muted-foreground">
            Your AI-generated content has been cryptographically sealed.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="security-card">
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">Sealing Complete</h2>
                <p className="text-sm text-muted-foreground">Your content is now verifiable</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bundle ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm font-mono bg-muted px-3 py-2 rounded flex-1 truncate">
                    {result.bundle_id}
                  </code>
                  <Button variant="ghost" size="icon" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {result.metadata?.model_name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">AI Model</label>
                    <p className="mt-1">{result.metadata.model_name}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Content Type</label>
                  <p className="mt-1">{result.metadata?.content_type || 'video'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Content Hash (SHA-256)</label>
                <code className="block text-sm font-mono bg-muted px-3 py-2 rounded mt-1 break-all">
                  {result.content_hash}
                </code>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Signature Algorithm</label>
                <p className="mt-1">{result.metadata?.signature_algorithm || 'RSA-PSS'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                <p className="mt-1">{result.metadata?.timestamp || new Date().toISOString()}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Bundle (JSON)</label>
                <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-48 mt-2">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>

            <div className="border-t border-border my-6" />

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download Bundle
              </Button>
              <Button variant="outline" asChild>
                <Link href="/verify">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Verify Now
                </Link>
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                Seal Another
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Input state
  return (
    <div>
      <div className="mb-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Seal AI Media</h1>
        <p className="text-muted-foreground">
          Cryptographically sign your AI-generated images and videos with embedded seals.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6 max-w-6xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {/* Left: File upload */}
        <div className="security-card">
          <label className="text-sm font-medium">
            Upload AI-Generated Media <span className="text-destructive">*</span>
          </label>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Upload an AI-generated image or video to seal (max 10MB)
          </p>
          {attachedFile ? (
              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {attachedFile.type.startsWith('image/') ? (
                      <Image className="h-8 w-8 text-primary" />
                    ) : attachedFile.type.startsWith('video/') ? (
                      <Film className="h-8 w-8 text-secondary" />
                    ) : (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{attachedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{attachedFile.type}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAttachedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {attachedFile.type.startsWith('image/') && (
                  <>
                    <img 
                      src={attachedFile.data} 
                      alt="Preview" 
                      className="mt-3 max-h-40 rounded mx-auto"
                    />
                    <div className="mt-4 p-3 bg-success/5 border border-success/20 rounded-lg">
                      <p className="text-sm text-success font-medium">Embedded Seal</p>
                      <p className="text-xs text-muted-foreground">
                        The signature will be stored directly in the image metadata (EXIF)
                      </p>
                    </div>
                  </>
                )}
                {attachedFile.type.startsWith('video/') && (
                  <video 
                    src={attachedFile.data}
                    controls
                    className="mt-3 max-h-40 rounded mx-auto"
                  />
                )}
              </div>
            ) : (
              <label className="cursor-pointer block border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors bg-muted/30">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Click to upload image or video
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileAttach}
                  className="hidden"
                />
              </label>
            )}
        </div>

        {/* Right: Metadata + action */}
        <div className="security-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Metadata</h3>
            <p className="text-xs text-muted-foreground">Required fields marked *</p>
          </div>

          <form onSubmit={handleSeal} className="space-y-6">
            <div>
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., AI-generated article about climate change"
                className="mt-1 bg-muted/50"
              />
            </div>

            <div>
              <label htmlFor="modelName" className="text-sm font-medium">
                AI Model
              </label>
              <select
                id="modelName"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
              >
                {AI_MODELS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
              {modelName === 'Other' && (
                <Input
                  value={customModelName}
                  onChange={(e) => setCustomModelName(e.target.value)}
                  placeholder="Enter custom model name"
                  className="mt-2 bg-muted/50"
                />
              )}
            </div>

            <div className="border-t border-border pt-6" />

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Signed with your certificate</p>
              <Button type="submit" size="lg" disabled={loading || !attachedFile}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sealing...
                  </>
                ) : (
                  <>
                    <FileSignature className="h-4 w-4 mr-2" />
                    Seal Content
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
