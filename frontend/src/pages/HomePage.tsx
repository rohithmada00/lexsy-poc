import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';

export default function HomePage() {
  const navigate = useNavigate();
  

  return (
    <div className="max-w-4xl w-full mx-auto px-4 py-12 sm:py-16">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <div className="mb-6">
          <h1 className="text-6xl sm:text-7xl font-extrabold bg-gradient-to-r from-blue-700 via-blue-600 to-emerald-600 dark:from-blue-400 dark:via-blue-300 dark:to-emerald-400 bg-clip-text text-transparent mb-4">
            Lexsy
          </h1>
        </div>
        <p className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          AI-Powered Legal Document Automation
        </p>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
          Streamline your legal document workflow with intelligent automation. 
          Upload your drafts, let AI identify placeholders, and fill them conversationally.
        </p>
      </section>

      {/* About Section - Commented out for now */}
      {/* 
      <section className="mb-16">
        <Card className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-800/50 dark:via-slate-800/30 dark:to-blue-950/20 border-2 border-slate-200/80 dark:border-slate-700/80">
          <div className="mb-8 pb-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="material-symbols-outlined text-white text-2xl">business_center</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
                About Lexsy
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-2 ml-16">
              Trusted by startups, investors, and accelerators
            </p>
          </div>
          <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
            <p className="text-base sm:text-lg font-normal">
              Lexsy is a cutting-edge legal AI automation platform designed specifically for startups, investors, and accelerators. 
              Our mission is to <span className="font-semibold text-gray-900 dark:text-gray-100">simplify the complex world of legal document generation and management</span>, 
              empowering businesses to move faster with confidence.
            </p>
            <div className="bg-white/60 dark:bg-slate-700/30 rounded-lg p-5 border-l-4 border-blue-600 dark:border-blue-400">
              <p className="text-base sm:text-lg font-normal">
                We understand that legal documents can be time-consuming and error-prone. That's why we've built an 
                intelligent system that analyzes your legal drafts, identifies dynamic placeholders, and helps you 
                fill them through a natural conversational interface powered by advanced AI.
              </p>
            </div>
            <p className="text-base sm:text-lg font-normal">
              Whether you're drafting contracts, agreements, or other legal documents, Lexsy makes the process 
              <span className="font-semibold text-gray-900 dark:text-gray-100"> faster, smarter, and more reliable</span>. 
              Experience the future of legal document automation.
            </p>
          </div>
        </Card>
      </section>
      */}

      {/* Feature Section */}
      <section>
        <Card className="bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-emerald-50/40 dark:from-blue-950/50 dark:via-indigo-950/30 dark:to-emerald-950/40 border-2 border-blue-200/60 dark:border-blue-700/40 shadow-xl">
          <div className="mb-8 pb-6 border-b border-blue-200/60 dark:border-blue-700/40">
            <div className="mb-3 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50 mb-3 tracking-tight">
                Conversational Document Filling
              </h2>
              <div className="h-1 w-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 dark:from-blue-400 dark:via-indigo-400 dark:to-emerald-400 rounded-full mx-auto"></div>
            </div>
          </div>
          
          <div className="mb-8">
            <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 leading-relaxed font-medium mb-6">
              Upload your .docx legal document and let our AI identify all dynamic placeholders. 
              Then, engage in a natural conversation to fill them in. Our intelligent assistant guides 
              you through the process, ensuring <span className="font-semibold text-gray-900 dark:text-gray-100">accuracy and completeness</span>.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-4 border border-blue-100 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">check_circle</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">AI-Powered Detection</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Automatically identifies placeholders</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-4 border border-blue-100 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">chat</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Natural Conversation</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Intuitive conversational interface</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-4 border border-blue-100 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-xl">bolt</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Real-Time Streaming</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Instant AI responses</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-4 border border-blue-100 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-xl">download</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Format Preservation</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Maintains original .docx styling</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-blue-200/60 dark:border-blue-700/40">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Ready to streamline your workflow?</span>
              </div>
              <Button
                onClick={() => navigate('/upload')}
                variant="primary"
                size="lg"
                className="w-full sm:w-auto text-lg px-10 py-4 font-semibold shadow-lg hover:shadow-xl transition-shadow"
              >
                <span className="flex items-center gap-2">
                  Get Started
                  <span className="material-symbols-outlined">arrow_forward</span>
                </span>
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

