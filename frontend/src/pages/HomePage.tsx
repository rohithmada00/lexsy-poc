import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';

export default function HomePage() {
  const navigate = useNavigate();
  

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
      {/* Hero Section */}
      <section className="text-center mb-20">
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

      {/* About Section */}
      <section className="mb-16">
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-3xl">info</span>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              About Lexsy
            </h2>
          </div>
          <div className="space-y-5 text-gray-700 dark:text-gray-300 leading-relaxed text-base sm:text-lg">
            <p>
              Lexsy is a cutting-edge legal AI automation platform designed for startups, investors, and accelerators. 
              Our mission is to simplify the complex world of legal document generation and management.
            </p>
            <p>
              We understand that legal documents can be time-consuming and error-prone. That's why we've built an 
              intelligent system that analyzes your legal drafts, identifies dynamic placeholders, and helps you 
              fill them through a natural conversational interface.
            </p>
            <p>
              Whether you're drafting contracts, agreements, or other legal documents, Lexsy makes the process 
              faster, smarter, and more reliable. Experience the future of legal document automation.
            </p>
          </div>
        </Card>
      </section>

      {/* Feature Section */}
      <section>
        <Card className="bg-gradient-to-br from-blue-50 via-indigo-50/30 to-emerald-50 dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-emerald-950/40 border-2 border-blue-300 dark:border-blue-600/50 shadow-2xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-2xl">smart_toy</span>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Conversational Document Filling
              </h2>
              <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"></div>
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed text-lg">
            Upload your .docx legal document and let our AI identify all dynamic placeholders. 
            Then, engage in a natural conversation to fill them in. Our intelligent assistant guides 
            you through the process, ensuring accuracy and completeness.
          </p>
          <ul className="list-none text-gray-700 dark:text-gray-300 mb-8 space-y-3">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 mt-0.5">check_circle</span>
              <span>AI-powered placeholder detection</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 mt-0.5">check_circle</span>
              <span>Conversational interface for filling fields</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 mt-0.5">check_circle</span>
              <span>Real-time streaming responses</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 mt-0.5">check_circle</span>
              <span>Preview and download completed documents</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 mt-0.5">check_circle</span>
              <span>Preserves original .docx formatting</span>
            </li>
          </ul>
          <div className="mt-8 pt-6 border-t-2 border-gray-200 dark:border-slate-700">
            <Button
              onClick={() => navigate('/upload')}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto text-lg px-8 py-4 font-semibold"
            >
              <span className="flex items-center gap-2">
                Get Started
                <span className="material-symbols-outlined">arrow_forward</span>
              </span>
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}

