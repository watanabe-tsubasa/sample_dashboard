import Test from "./Test";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-5xl font-bold tracking-tight text-left text-gray-900 dark:text-white sm:text-7xl">Welcome to Next.js!</h1>
        <p className="mt-5 text-2xl text-gray-500 dark:text-gray-400">
          Get started by editing <code className="bg-gray-100 dark:bg-gray-800 rounded-md p-3 font-mono text-sm">app/page.tsx</code>
        </p>
        <Test />
      </main>
    </div>
  );
}
