export default function AuthErrorPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Błąd logowania</h1>
      <p className="mb-4">Link jest nieprawidłowy lub wygasł.</p>
      <a href="/login" className="underline">
        Spróbuj ponownie
      </a>
    </div>
  );
}
