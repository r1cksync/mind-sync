export default function Home() {
  return (
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-4xl text-purple-500" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
        Welcome! Please <a href="/sign-in" className="underline">sign in</a>.
      </h1>
    </div>
  );
}