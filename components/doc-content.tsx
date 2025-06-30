"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Copy, Check, Edit, Share, ThumbsUp, ThumbsDown } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface DocContentProps {
  title: string
  content: string
  lastUpdated: string
}

export function DocContent({ title, content, lastUpdated }: DocContentProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<"helpful" | "not-helpful" | null>(null)

  const copyToClipboard = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleFeedback = (type: "helpful" | "not-helpful") => {
    setFeedback(type)
    // In a real app, you'd send this feedback to your analytics
  }

  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      {/* Header */}
      <div className="not-prose mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 bg-transparent"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 bg-transparent"
            >
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
          <span>Last updated: {new Date(lastUpdated).toLocaleDateString()}</span>
          <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            v5.7
          </Badge>
        </div>

        <Separator className="mt-6 bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Content */}
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
            const codeId = Math.random().toString(36).substr(2, 9)

            return !inline && match ? (
              <div className="relative group">
                <div className="flex items-center justify-between bg-slate-800 dark:bg-slate-900 text-slate-200 dark:text-slate-300 px-4 py-2 text-sm rounded-t-lg">
                  <span className="font-medium">{match[1]}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-slate-400 dark:text-slate-500 hover:text-slate-200 dark:hover:text-slate-300"
                    onClick={() => copyToClipboard(String(children).replace(/\n$/, ""), codeId)}
                  >
                    {copiedCode === codeId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>

                <pre className="overflow-x-auto bg-slate-900 dark:bg-slate-950 text-slate-100 dark:text-slate-200 text-sm p-4 font-mono rounded-b-lg">
                  <code>{String(children).replace(/\n$/, "")}</code>
                </pre>
              </div>
            ) : (
              <code
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded text-sm"
                {...props}
              >
                {children}
              </code>
            )
          },
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-8 mb-4 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-8 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-6 mb-3">{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 p-4 my-4 rounded-r-lg">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline underline-offset-2"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Footer */}
      <div className="not-prose mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Was this page helpful?</p>
            <div className="flex space-x-2">
              <Button
                variant={feedback === "helpful" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFeedback("helpful")}
                className={
                  feedback !== "helpful"
                    ? "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    : ""
                }
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Yes
              </Button>
              <Button
                variant={feedback === "not-helpful" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFeedback("not-helpful")}
                className={
                  feedback !== "not-helpful"
                    ? "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    : ""
                }
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                No
              </Button>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Found an issue?
              <Button
                variant="link"
                className="p-0 ml-1 h-auto text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Edit this page
              </Button>
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}
