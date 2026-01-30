import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Entrega Pra Mim
              </span>
            </div>
            <div className="flex gap-4">
              <Link
                href="/login"
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                Entrar
              </Link>
              <Link
                href="/registro"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Cadastre-se
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Entregas rapidas e seguras
            <br />
            <span className="text-blue-600">com motoboys confiáveis</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Plataforma completa para gerenciamento de entregas. Calcule rotas,
            acompanhe em tempo real e tenha entregas garantidas.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/registro"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg"
            >
              Comece Agora
            </Link>
            <Link
              href="#como-funciona"
              className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-lg"
            >
              Saiba Mais
            </Link>
          </div>
        </div>

        {/* Features */}
        <div id="como-funciona" className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Calculo de Rotas
            </h3>
            <p className="text-gray-600">
              Rotas otimizadas via Google Maps com calculo automatico de
              distancia, tempo e preco.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Rastreamento em Tempo Real
            </h3>
            <p className="text-gray-600">
              Acompanhe sua entrega em tempo real e saiba exatamente quando ela
              vai chegar.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Motoboys Verificados
            </h3>
            <p className="text-gray-600">
              Todos os motoboys passam por verificacao e possuem avaliacao dos
              clientes.
            </p>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Precos Transparentes
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Entrega Agendada
              </h3>
              <p className="text-3xl font-bold text-blue-600 mb-2">
                R$ 3,00<span className="text-sm font-normal">/km</span>
              </p>
              <p className="text-gray-600 text-sm">
                Agende a coleta para data e horario especificos
              </p>
            </div>

            <div className="border-2 border-blue-600 rounded-lg p-6 text-center relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                Popular
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Documentos
              </h3>
              <p className="text-3xl font-bold text-blue-600 mb-2">
                R$ 3,60<span className="text-sm font-normal">/km</span>
              </p>
              <p className="text-gray-600 text-sm">
                Servico especial com confirmacao de recebimento
              </p>
            </div>

            <div className="border rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Entrega Expressa
              </h3>
              <p className="text-3xl font-bold text-blue-600 mb-2">
                R$ 4,50<span className="text-sm font-normal">/km</span>
              </p>
              <p className="text-gray-600 text-sm">
                Coleta imediata com prioridade maxima
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-blue-600 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Pronto para comecar?
          </h2>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            Cadastre-se agora e faca sua primeira entrega. E motoboy? Cadastre-se
            e comece a ganhar dinheiro.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/registro?tipo=cliente"
              className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
            >
              Sou Cliente
            </Link>
            <Link
              href="/registro?tipo=motoboy"
              className="px-6 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 font-medium"
            >
              Sou Motoboy
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <span className="text-white font-semibold">Entrega Pra Mim</span>
            </div>
            <p className="text-sm">
              2024 Entrega Pra Mim. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
