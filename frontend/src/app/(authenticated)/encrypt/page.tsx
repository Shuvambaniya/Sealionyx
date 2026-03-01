'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Lock, 
  AlertCircle, 
  CheckCircle,
  Copy,
  Download,
  RefreshCw,
  Unlock,
  Send,
  Upload,
  Image,
  Film,
  FileText,
  X,
  User,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Clock,
  Key,
  Hash,
  FileWarning,
  UserX,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { createBrowserClient } from '@/lib/supabase'
import { encryptContent, decryptContent, getMyStatus } from '@/lib/api'
import { downloadJson, copyToClipboard } from '@/lib/utils'

type Mode = 'encrypt' | 'decrypt'

export default function EncryptPage() {
  const [mode, setMode] = useState<Mode>('encrypt')
  const [provisioned, setProvisioned] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  
  // Encrypt state
  const [content, setContent] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [signContent, setSignContent] = useState(true)
  const [encryptedResult, setEncryptedResult] = useState<any>(null)
  const [attachedFile, setAttachedFile] = useState<{name: string, type: string, data: string} | null>(null)
  
  // Decrypt state
  const [encryptedBundle, setEncryptedBundle] = useState('')
  const [decryptedResult, setDecryptedResult] = useState<any>(null)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.')
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

  const handleEncrypt = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim() && !attachedFile) {
      setError('Please enter content or attach a file to encrypt')
      return
    }
    if (!recipientEmail.trim()) {
      setError('Please enter recipient email')
      return
    }

    setLoading(true)
    setError(null)
    setEncryptedResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      let contentToEncrypt = content.trim()
      if (attachedFile) {
        const fileData = {
          text: contentToEncrypt || null,
          file: {
            name: attachedFile.name,
            type: attachedFile.type,
            data: attachedFile.data
          }
        }
        contentToEncrypt = JSON.stringify(fileData)
      }

      const response = await encryptContent(session.access_token, {
        content: contentToEncrypt,
        recipient_email: recipientEmail.trim(),
        sign: signContent,
      })

      if (response.error) {
        setError(response.error)
      } else if (response.data?.encrypted_bundle) {
        setEncryptedResult(response.data.encrypted_bundle)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encryption failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDecrypt = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!encryptedBundle.trim()) {
      setError('Please enter the encrypted bundle')
      return
    }

    setLoading(true)
    setError(null)
    setDecryptedResult(null)

    try {
      const bundle = JSON.parse(encryptedBundle)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const response = await decryptContent(session.access_token, {
        encrypted_bundle: bundle,
      })

      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        // Check if decryption failed (success=false in response)
        if (!response.data.success && response.data.error_code) {
          // Set the result so we can show detailed error in UI
          setDecryptedResult(response.data)
        } else {
          setDecryptedResult(response.data)
        }
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format. Please ensure you have a valid encrypted bundle.')
      } else {
        setError(err instanceof Error ? err.message : 'Decryption failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (encryptedResult) {
      await copyToClipboard(JSON.stringify(encryptedResult, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    if (encryptedResult) {
      downloadJson(encryptedResult, `encrypted-bundle-${encryptedResult.bundle_id || 'content'}.json`)
    }
  }

  const handleReset = () => {
    setContent('')
    setRecipientEmail('')
    setEncryptedBundle('')
    setEncryptedResult(null)
    setDecryptedResult(null)
    setAttachedFile(null)
    setError(null)
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
            <span className="text-muted-foreground">You need to provision a certificate before you can encrypt content.</span>
            <Link href="/certificate">
              <Button size="sm" className="ml-4">Get Certificate</Button>
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Encrypt & Share</h1>
        <p className="text-muted-foreground">
          Securely encrypt content for specific recipients using hybrid encryption.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex space-x-2 mb-6">
        <Button
          variant={mode === 'encrypt' ? 'default' : 'outline'}
          onClick={() => { setMode('encrypt'); handleReset(); }}
        >
          <Lock className="h-4 w-4 mr-2" />
          Encrypt
        </Button>
        <Button
          variant={mode === 'decrypt' ? 'default' : 'outline'}
          onClick={() => { setMode('decrypt'); handleReset(); }}
        >
          <Unlock className="h-4 w-4 mr-2" />
          Decrypt
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {mode === 'encrypt' ? (
        // Encrypt Mode
        !encryptedResult ? (
          <div>
            <div className="security-card">
              <div className="space-y-6">
                {/* Recipient Selection */}
                <div>
                  <label htmlFor="recipient" className="text-sm font-medium">
                    Recipient Email <span className="text-destructive">*</span>
                  </label>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Choose who will be able to decrypt this content
                  </p>
                  <Input
                    id="recipient"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="recipient@example.com"
                    className="bg-muted/50"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The recipient must have a provisioned certificate
                  </p>
                </div>

                <div className="border-t border-border" />

                {/* Content Input */}
                <div>
                  <label htmlFor="content" className="text-sm font-medium">
                    Content to Encrypt {!attachedFile && <span className="text-destructive">*</span>}
                  </label>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Paste the content you want to encrypt or attach a file
                  </p>
                  <Textarea
                    id="content"
                    placeholder="Enter the content you want to securely share..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[200px] font-mono text-sm bg-muted/50"
                    required={!attachedFile}
                  />
                </div>

                {/* File Attachment */}
                <div>
                  <label className="text-sm font-medium">
                    Attach File (Photo/Video)
                  </label>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Optionally attach an image or video (max 5MB)
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
                        <img 
                          src={attachedFile.data} 
                          alt="Preview" 
                          className="mt-3 max-h-32 rounded"
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

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sign"
                    checked={signContent}
                    onChange={(e) => setSignContent(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-muted"
                  />
                  <label htmlFor="sign" className="text-sm text-muted-foreground">
                    Also sign the content (recommended)
                  </label>
                </div>

                <div className="border-t border-border pt-6" />

                {/* Encrypt Button */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Uses hybrid encryption (AES-256 + RSA)
                  </p>
                  <Button onClick={handleEncrypt} size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Encrypting...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Encrypt for Recipient
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border max-w-4xl">
              <div className="flex gap-3">
                <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">End-to-End Encryption</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Only the intended recipient can decrypt this content using their private key. Even Sealionyx cannot access the encrypted content.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Encryption Success
          <div>
            <div className="security-card">
              <div className="flex items-center gap-4 mb-6 flex-wrap">
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold">Content Encrypted</h2>
                  <p className="text-sm text-muted-foreground truncate">
                    Only {recipientEmail} can decrypt this content
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{recipientEmail}</p>
                    <p className="text-sm text-muted-foreground">Recipient</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  The recipient's public key was used for encryption. They can decrypt using their private key.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Encrypted Bundle (JSON)</label>
                <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-48 mt-2">
                  {JSON.stringify(encryptedResult, null, 2)}
                </pre>
              </div>

              <div className="border-t border-border my-6" />

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Encrypted Bundle
                </Button>
                <Button variant="outline" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button variant="ghost" onClick={handleReset}>
                  Encrypt Another
                </Button>
              </div>
            </div>

            {/* Security Info */}
            <div className="mt-6 p-4 rounded-lg bg-info/5 border border-info/20 max-w-4xl">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-info shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Hybrid Encryption</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Content is encrypted using AES-256, and the symmetric key is encrypted with the recipient's RSA public key. Only the intended recipient can decrypt this content.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        // Decrypt Mode
        !decryptedResult ? (
          <div>
            <div className="security-card">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="text-sm font-medium">
                        Encrypted Bundle (JSON) <span className="text-destructive">*</span>
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload or paste an encrypted bundle that was created for you
                      </p>
                    </div>
                    <label className="cursor-pointer inline-flex items-center text-sm text-primary hover:underline">
                      <Upload className="h-4 w-4 mr-1" />
                      Upload File
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const content = event.target?.result as string
                            setEncryptedBundle(content)
                            setError(null)
                          }
                          reader.onerror = () => {
                            setError('Failed to read file')
                          }
                          reader.readAsText(file)
                          e.target.value = ''
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <Textarea
                    value={encryptedBundle}
                    onChange={(e) => setEncryptedBundle(e.target.value)}
                    placeholder='{"version": "1.0", "encrypted_content": "...", ...}'
                    className="min-h-[300px] font-mono text-sm bg-muted/50"
                    required
                  />
                </div>

                <div className="border-t border-border pt-6" />

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Your private key will be used to decrypt
                  </p>
                  <Button onClick={handleDecrypt} size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Decrypting...
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-2" />
                        Decrypt Content
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Decryption Result (Success or Failure with details)
          <div>
            <div className="security-card">
              {/* Decryption Failed - Show Error Details */}
              {!decryptedResult.success ? (
                <DecryptionErrorDisplay 
                  errorCode={decryptedResult.error_code}
                  errorDetails={decryptedResult.error_details}
                  onReset={handleReset}
                />
              ) : (
                <>
                  {/* Decryption Success Header */}
                  <div className="flex items-center gap-4 mb-6 flex-wrap">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                      decryptedResult.was_sealed 
                        ? decryptedResult.signature_valid 
                          ? 'bg-success/10' 
                          : 'bg-warning/10'
                        : 'bg-success/10'
                    }`}>
                      {decryptedResult.was_sealed ? (
                        decryptedResult.signature_valid ? (
                          <ShieldCheck className="h-6 w-6 text-success" />
                        ) : (
                          <ShieldAlert className="h-6 w-6 text-warning" />
                        )
                      ) : (
                        <CheckCircle className="h-6 w-6 text-success" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold">Content Decrypted</h2>
                      <p className="text-sm text-muted-foreground">
                        {decryptedResult.was_sealed ? (
                          decryptedResult.signature_valid ? (
                            <span className="text-success">Sealed content - signature verified</span>
                          ) : (
                            <span className="text-warning">Sealed content - signature verification failed</span>
                          )
                        ) : (
                          <span>Encrypted content (not sealed)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Seal Verification Details (if content was sealed) */}
                  {decryptedResult.was_sealed && decryptedResult.seal_details && (
                    <SealVerificationDisplay 
                      sealDetails={decryptedResult.seal_details}
                      signatureValid={decryptedResult.signature_valid}
                    />
                  )}

                  {/* Sender Information (for non-sealed content) */}
                  {!decryptedResult.was_sealed && decryptedResult.sender_info && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mb-4">
                      <h4 className="text-sm font-medium mb-2">Sender Details</h4>
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">
                            {decryptedResult.sender_info.email || decryptedResult.sender_info.common_name || 'Unknown'}
                          </p>
                          {decryptedResult.sender_info.encrypted_at && (
                            <p className="text-xs text-muted-foreground">
                              Encrypted at: {new Date(decryptedResult.sender_info.encrypted_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warning for signature issues */}
                  {decryptedResult.error_code && (
                    <div className="p-4 rounded-lg bg-warning/10 border border-warning/25 mb-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-warning">
                            {decryptedResult.error_code === 'SIGNER_REVOKED' && 'Signer Certificate Revoked'}
                            {decryptedResult.error_code === 'SIGNATURE_INVALID' && 'Signature Verification Failed'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {decryptedResult.error_details}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Decrypted Content */}
                  <DecryptedContentDisplay content={decryptedResult.content} />

                  <div className="border-t border-border my-6" />

                  <Button variant="outline" onClick={handleReset}>
                    Decrypt Another
                  </Button>
                </>
              )}
            </div>
          </div>
        )
      )}

      {/* How it Works */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">How Hybrid Encryption Works</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="security-card">
            <h4 className="font-medium mb-3">Encryption Process</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Generate random AES-256 key</li>
              <li>Encrypt content with AES-256-GCM</li>
              <li>Encrypt AES key with recipient's RSA public key</li>
              <li>Bundle encrypted content + encrypted key</li>
            </ol>
          </div>
          <div className="security-card">
            <h4 className="font-medium mb-3">Decryption Process</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Recipient uses their RSA private key</li>
              <li>Decrypt the AES key</li>
              <li>Use AES key to decrypt content</li>
              <li>Verify signature if present</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

// Component to display decrypted content (text, images, videos)
function DecryptedContentDisplay({ content }: { content: string }) {
  // Try to parse as JSON with file attachment
  try {
    const parsed = JSON.parse(content)
    if (parsed.file && parsed.file.data) {
      const { file, text } = parsed
      const isImage = file.type?.startsWith('image/')
      const isVideo = file.type?.startsWith('video/')

      return (
        <div className="space-y-4">
          {/* Text content if present */}
          {text && (
            <div>
              <h4 className="text-sm font-medium mb-2">Message</h4>
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <pre className="whitespace-pre-wrap text-sm">{text}</pre>
              </div>
            </div>
          )}

          {/* File attachment */}
          <div>
            <h4 className="text-sm font-medium mb-2">
              Attached File: {file.name}
            </h4>
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              {isImage && (
                <img 
                  src={file.data} 
                  alt={file.name}
                  className="max-w-full max-h-96 rounded mx-auto"
                />
              )}
              {isVideo && (
                <video 
                  src={file.data}
                  controls
                  className="max-w-full max-h-96 rounded mx-auto"
                >
                  Your browser does not support video playback.
                </video>
              )}
              {!isImage && !isVideo && (
                <div className="text-center py-4">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{file.type}</p>
                  <a 
                    href={file.data} 
                    download={file.name}
                    className="inline-block mt-2 text-primary hover:underline text-sm"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }
  } catch {
    // Not JSON, display as plain text
  }

  // Plain text content
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">Message Content</h4>
      <div className="bg-muted/50 p-4 rounded-lg border border-border">
        <pre className="whitespace-pre-wrap text-sm">{content}</pre>
      </div>
    </div>
  )
}

// Component to display decryption errors with clear, user-friendly messages
function DecryptionErrorDisplay({ 
  errorCode, 
  errorDetails,
  onReset 
}: { 
  errorCode?: string
  errorDetails?: string
  onReset: () => void
}) {
  const getErrorInfo = () => {
    switch (errorCode) {
      case 'INVALID_FORMAT':
        return {
          icon: <FileWarning className="h-6 w-6 text-destructive" />,
          title: 'Invalid Bundle Format',
          description: 'The encrypted bundle format is invalid or corrupted.',
          color: 'bg-destructive/10'
        }
      case 'WRONG_RECIPIENT':
        return {
          icon: <UserX className="h-6 w-6 text-warning" />,
          title: 'Not The Intended Recipient',
          description: 'This content was encrypted for a different user.',
          color: 'bg-warning/10'
        }
      case 'TAMPERED_DATA':
        return {
          icon: <ShieldX className="h-6 w-6 text-destructive" />,
          title: 'Data Tampered or Corrupted',
          description: 'The encrypted data has been modified or corrupted.',
          color: 'bg-destructive/10'
        }
      default:
        return {
          icon: <XCircle className="h-6 w-6 text-destructive" />,
          title: 'Decryption Failed',
          description: 'Unable to decrypt the content.',
          color: 'bg-destructive/10'
        }
    }
  }

  const errorInfo = getErrorInfo()

  return (
    <div className="space-y-6">
      {/* Error Header */}
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-full ${errorInfo.color} flex items-center justify-center shrink-0`}>
          {errorInfo.icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-destructive">{errorInfo.title}</h2>
          <p className="text-sm text-muted-foreground">{errorInfo.description}</p>
        </div>
      </div>

      {/* Detailed Error */}
      {errorDetails && (
        <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Error Details</p>
              <p className="text-sm text-muted-foreground mt-1">{errorDetails}</p>
            </div>
          </div>
        </div>
      )}

      {/* What to do */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm font-medium mb-2">What to do:</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          {errorCode === 'WRONG_RECIPIENT' && (
            <>
              <li>Ensure the sender encrypted this content for your email address</li>
              <li>Ask the sender to re-encrypt for the correct recipient</li>
            </>
          )}
          {errorCode === 'TAMPERED_DATA' && (
            <>
              <li>The encrypted bundle may have been modified during transfer</li>
              <li>Ask the sender to send the bundle again</li>
            </>
          )}
          {errorCode === 'INVALID_FORMAT' && (
            <>
              <li>Ensure you uploaded the complete, unmodified .json file</li>
              <li>The file may be corrupted or not an encrypted bundle</li>
            </>
          )}
          {!errorCode && (
            <li>Try uploading the bundle again or contact the sender</li>
          )}
        </ul>
      </div>

      <Button variant="outline" onClick={onReset}>
        Try Another Bundle
      </Button>
    </div>
  )
}

// Component to display seal verification details after successful decryption
function SealVerificationDisplay({ 
  sealDetails,
  signatureValid 
}: { 
  sealDetails: any
  signatureValid?: boolean | null
}) {
  return (
    <div className="space-y-4 mb-4">
      {/* Seal Status Card */}
      <div className={`p-4 rounded-lg border ${
        signatureValid 
          ? 'bg-success/5 border-success/20' 
          : 'bg-warning/5 border-warning/20'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
            signatureValid ? 'bg-success/10' : 'bg-warning/10'
          }`}>
            {signatureValid ? (
              <ShieldCheck className="h-5 w-5 text-success" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-warning" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium ${signatureValid ? 'text-success' : 'text-warning'}`}>
              {signatureValid ? 'Content Authenticity Verified' : 'Signature Verification Failed'}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              {signatureValid 
                ? 'This content was cryptographically sealed and the signature is valid.'
                : 'The signature could not be verified. The content may have been modified.'}
            </p>
          </div>
        </div>
      </div>

      {/* Signer Information */}
      {sealDetails.signer_info && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Key className="h-4 w-4" />
            Signer Information
          </h4>
          <div className="space-y-2">
            {sealDetails.signer_info.email && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{sealDetails.signer_info.email}</span>
              </div>
            )}
            {sealDetails.signer_info.common_name && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{sealDetails.signer_info.common_name}</span>
              </div>
            )}
            {sealDetails.signer_info.serial_number && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Certificate:</span>
                <span className="font-mono text-xs">{sealDetails.signer_info.serial_number}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seal Timestamp */}
      {sealDetails.sealed_at && (
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Seal Timestamp
          </h4>
          <p className="text-sm">
            <span className="text-muted-foreground">Sealed at: </span>
            <span className="font-medium">
              {new Date(sealDetails.sealed_at).toLocaleString()}
            </span>
          </p>
        </div>
      )}

      {/* Content Hash */}
      {sealDetails.content_hash && (
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Content Hash (SHA-256)
          </h4>
          <code className="text-xs font-mono text-muted-foreground break-all block">
            {sealDetails.content_hash}
          </code>
        </div>
      )}

      {/* Additional Metadata */}
      {(sealDetails.model_name || sealDetails.title) && (
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <h4 className="text-sm font-medium mb-3">Additional Information</h4>
          <div className="space-y-2 text-sm">
            {sealDetails.title && (
              <div>
                <span className="text-muted-foreground">Title: </span>
                <span>{sealDetails.title}</span>
              </div>
            )}
            {sealDetails.model_name && (
              <div>
                <span className="text-muted-foreground">AI Model: </span>
                <span>{sealDetails.model_name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verification Errors (if any) */}
      {sealDetails.verification_errors && sealDetails.verification_errors.length > 0 && (
        <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <h4 className="text-sm font-medium mb-2 text-destructive">Verification Issues</h4>
          <ul className="space-y-1">
            {sealDetails.verification_errors.map((err: string, i: number) => (
              <li key={i} className="text-sm text-destructive flex items-start gap-2">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
