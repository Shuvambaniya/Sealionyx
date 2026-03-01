'use client'

import { Shield } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-semibold text-gray-900">Sealionyx</span>
          </div>
          
          <div className="text-sm text-gray-500 text-center md:text-left">
            <p>Cryptographic Authenticity for AI-Generated Content</p>
            <p className="mt-1">ST6051CEM Practical Cryptography Coursework</p>
          </div>
          
          <div className="flex space-x-6 text-sm text-gray-500">
            <span>PKI/X.509</span>
            <span>RSA-2048</span>
            <span>AES-256-GCM</span>
          </div>
        </div>
        
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>Built with Next.js, FastAPI, and Python cryptography</p>
        </div>
      </div>
    </footer>
  )
}
