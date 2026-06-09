import { useState } from 'react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import SectionHeader from '../../components/ui/SectionHeader'
import Badge from '../../components/ui/Badge'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'

export default function ImportCalendarPage() {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [imported, setImported] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      processFile(files[0])
    }
  }

  const handleChange = (e) => {
    const files = e.target.files
    if (files && files[0]) {
      processFile(files[0])
    }
  }

  const processFile = (f) => {
    if (f.type === 'application/pdf' || f.type === 'text/calendar' || f.name.endsWith('.ics')) {
      setFile(f)
      // Mock preview data
      setPreview({
        fileName: f.name,
        events: 23,
        dateRange: 'Sep 2024 - Jun 2025',
        children: ['Emma', 'Liam'],
      })
    }
  }

  const handleImport = () => {
    // Simulate import
    setImported(true)
    setTimeout(() => {
      // Reset after 2 seconds
    }, 2000)
  }

  return (
    <div className="space-y-6 pt-4">
      <SectionHeader title="Import Calendar" />

      <Card className="bg-teal-light border-2 border-teal p-4 space-y-2">
        <p className="text-body font-semibold text-teal">Quick Import</p>
        <p className="text-caption text-teal">Upload your school calendar or iCal file to instantly add 20+ events.</p>
      </Card>

      {!imported ? (
        <>
          {/* File Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative p-8 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
              dragActive ? 'border-primary bg-primary-light' : 'border-border hover:border-primary'
            }`}
          >
            <input
              type="file"
              accept=".pdf,.ics,.ical"
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="text-center">
              <Upload size={48} className="mx-auto mb-3 text-primary opacity-50" />
              <p className="text-body font-semibold mb-1">Drag and drop your calendar file</p>
              <p className="text-caption text-text-secondary">or click to browse</p>
              <p className="text-xs text-text-secondary mt-2">Supported: PDF, ICS, iCal files</p>
            </div>
          </div>

          {/* File Preview */}
          {file && preview && !imported && (
            <Card className="space-y-3">
              <div className="flex items-start gap-3">
                <FileText size={24} className="text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-body font-semibold">{preview.fileName}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="primary">{preview.events} events</Badge>
                    <Badge variant="teal">{preview.dateRange}</Badge>
                  </div>
                  <div className="mt-2">
                    <p className="text-caption text-text-secondary mb-1">For children:</p>
                    <div className="flex gap-1">
                      {preview.children.map((child) => (
                        <Badge key={child} variant="gray">
                          {child}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setFile(null)
                    setPreview(null)
                  }}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleImport}>
                  Import Calendar
                </Button>
              </div>
            </Card>
          )}

          {/* Help Section */}
          <Card className="bg-muted">
            <h3 className="text-h3 font-semibold mb-3">Need help?</h3>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>
                <strong>For Google Calendar:</strong> Export from Google Calendar → Download as .ics file → Upload here
              </p>
              <p>
                <strong>For Outlook:</strong> Export → Select .ics format → Upload here
              </p>
              <p>
                <strong>For school websites:</strong> Many schools provide .ics calendar links or PDFs → Download and upload
              </p>
            </div>
          </Card>
        </>
      ) : (
        <Card className="bg-teal-light border-2 border-teal text-center py-12">
          <CheckCircle size={48} className="mx-auto mb-3 text-teal" />
          <p className="text-h3 font-semibold text-teal mb-2">Calendar Imported!</p>
          <p className="text-caption text-teal mb-4">23 events added for Emma and Liam</p>
          <Button
            variant="secondary"
            onClick={() => {
              setImported(false)
              setFile(null)
              setPreview(null)
            }}
          >
            Import Another Calendar
          </Button>
        </Card>
      )}
    </div>
  )
}
