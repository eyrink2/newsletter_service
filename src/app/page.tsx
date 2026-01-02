import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <main className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 max-w-lg text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Group Newsletter
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          A simple way to stay connected with your small group through shared updates and stories.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Go to Creator Dashboard
        </Link>
      </main>
    </div>
  );
}
