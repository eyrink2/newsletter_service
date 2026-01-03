import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FFFBF1', fontFamily: 'Georgia, serif' }}>
      <main className="rounded-2xl shadow-xl p-8 sm:p-12 max-w-lg text-center" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px' }}>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
          Group Newsletter
        </h1>
        <p className="mb-8 text-lg" style={{ color: '#666666' }}>
          A simple way to stay connected with your small group through shared updates and stories.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
          style={{ backgroundColor: '#5d888e', fontFamily: 'Georgia, serif' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a6d72'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5d888e'}
        >
          Go to Creator Dashboard
        </Link>
      </main>
    </div>
  );
}
