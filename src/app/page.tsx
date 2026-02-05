'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 }
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <motion.header
        className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/20 dark:border-slate-800/50 sticky top-0 z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3">
              <motion.div
                className="w-12 h-12 relative rounded-xl overflow-hidden"
                whileHover={{ rotate: 5, scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Image src="/icons/app-icon.png" alt="Entrega Pra Mim" fill className="object-cover" />
              </motion.div>
              <span className="text-xl font-bold text-gradient">
                ENTREGA PRA MIM
              </span>
            </Link>
            <div className="flex gap-3 items-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/login"
                  className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 font-medium rounded-xl hover:bg-cyan-500/10 transition-all duration-200"
                >
                  Entrar
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/registro"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#0A4D68] to-cyan-500 text-white rounded-xl font-semibold hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 border border-cyan-400/20"
                >
                  Cadastre-se
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="gradient-bg absolute inset-0 opacity-90" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <motion.div
              className="flex-1 text-center lg:text-left"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white"
                variants={fadeInUp}
              >
                Entregas rápidas e seguras com{' '}
                <span className="text-cyan-300">motoboys confiáveis</span>
              </motion.h1>
              <motion.p
                className="text-lg text-white/80 mb-8 max-w-xl"
                variants={fadeInUp}
              >
                Plataforma de tecnologia logística e delivery urbano.
                Velocidade, agilidade, precisão e confiabilidade.
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                variants={fadeInUp}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/registro"
                    className="inline-block px-8 py-4 bg-white text-[#0A4D68] rounded-xl font-semibold text-lg hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all duration-300"
                  >
                    Comece Agora
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="#como-funciona"
                    className="inline-block px-8 py-4 border-2 border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/10 hover:border-white/50 backdrop-blur-sm transition-all duration-300"
                  >
                    Saiba Mais
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
            <motion.div
              className="flex-1 flex justify-center"
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: 'spring' }}
            >
              <div className="w-64 h-64 sm:w-80 sm:h-80 relative float">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl" />
                <Image
                  src="/logo-badge.jpg"
                  alt="Entrega Pra Mim Logo"
                  fill
                  className="object-contain drop-shadow-2xl relative z-10 rounded-full"
                  priority
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-20 fill-slate-50 dark:fill-slate-950">
            <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" />
          </svg>
        </div>
      </section>

      {/* Valores */}
      <motion.section
        className="py-16 relative z-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Velocidade', desc: 'Entregas rápidas', icon: '⚡' },
              { label: 'Agilidade', desc: 'Processo simplificado', icon: '🚀' },
              { label: 'Precisão', desc: 'Rastreamento em tempo real', icon: '📍' },
              { label: 'Confiabilidade', desc: 'Motoboys verificados', icon: '✓' },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                className="text-center p-6 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 hover:shadow-[0_0_40px_rgba(6,182,212,0.15)] transition-all duration-300"
                variants={scaleIn}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <motion.div
                  className="w-14 h-14 bg-gradient-to-br from-[#0A4D68] to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/20"
                  whileHover={{ rotate: 10 }}
                >
                  <span className="text-2xl">{item.icon}</span>
                </motion.div>
                <h3 className="font-bold text-slate-800 dark:text-white">{item.label}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-20 sm:py-28 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gradient mb-4">Como Funciona</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">
              Solicite entregas em poucos cliques e acompanhe tudo em tempo real.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {[
              {
                title: 'Cálculo de Rotas',
                desc: 'Rotas otimizadas via Google Maps com cálculo automático de distância, tempo e preço.',
                icon: (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                ),
              },
              {
                title: 'Rastreamento em Tempo Real',
                desc: 'Acompanhe sua entrega no mapa e saiba exatamente quando ela vai chegar.',
                icon: (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
              {
                title: 'Motoboys Verificados',
                desc: 'Todos os entregadores passam por verificação e possuem avaliação dos clientes.',
                icon: (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl p-8 text-center hover:shadow-[0_0_50px_rgba(6,182,212,0.2)] transition-all duration-500"
                variants={fadeInUp}
                whileHover={{ y: -10 }}
              >
                <motion.div
                  className="w-20 h-20 bg-gradient-to-br from-[#0A4D68] to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-cyan-500/30"
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {item.icon}
                </motion.div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">{item.title}</h3>
                <p className="text-slate-500 dark:text-slate-400">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Preços */}
      <motion.section
        className="py-20 sm:py-28 relative z-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" variants={fadeInUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-gradient mb-4">Preços Transparentes</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Sem surpresas. Você sabe exatamente quanto vai pagar.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { title: 'Entrega Agendada', price: 'R$ 3,00', unit: '/km', desc: 'Agende para data e horário específicos', featured: false },
              { title: 'Documentos', price: 'R$ 3,60', unit: '/km', desc: 'Confirmação de recebimento inclusa', featured: true },
              { title: 'Entrega Expressa', price: 'R$ 4,50', unit: '/km', desc: 'Coleta imediata, prioridade máxima', featured: false },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                className={`rounded-2xl p-8 text-center relative overflow-hidden transition-all duration-500 ${
                  item.featured
                    ? 'bg-gradient-to-br from-[#0A4D68] to-cyan-600 text-white shadow-2xl shadow-cyan-500/30 scale-105'
                    : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50'
                }`}
                variants={scaleIn}
                whileHover={{ y: -8, scale: item.featured ? 1.08 : 1.03 }}
              >
                {item.featured && (
                  <motion.span
                    className="absolute -top-1 left-1/2 -translate-x-1/2 bg-white text-[#0A4D68] text-xs px-4 py-1.5 rounded-full font-bold shadow-lg"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Popular
                  </motion.span>
                )}
                <h3 className={`font-bold mb-3 ${item.featured ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                  {item.title}
                </h3>
                <p className={`text-4xl font-bold mb-2 ${item.featured ? 'text-white' : 'text-gradient'}`}>
                  {item.price}
                  <span className={`text-sm font-normal ${item.featured ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>
                    {item.unit}
                  </span>
                </p>
                <p className={`text-sm ${item.featured ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA */}
      <section className="py-20 sm:py-28 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="gradient-bg rounded-3xl p-10 sm:p-16 text-center text-white relative overflow-hidden"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-cyan-300/20 rounded-full blur-3xl" />
            </div>

            <motion.h2
              className="text-3xl sm:text-4xl font-bold mb-4 relative z-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Pronto para começar?
            </motion.h2>
            <motion.p
              className="text-white/80 mb-10 max-w-xl mx-auto text-lg relative z-10"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              Cadastre-se agora e faça sua primeira entrega. É motoboy? Cadastre-se e comece a ganhar dinheiro.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center relative z-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/registro?tipo=cliente"
                  className="inline-block px-10 py-4 bg-white text-[#0A4D68] rounded-xl font-bold hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] transition-all duration-300"
                >
                  Sou Cliente
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/registro?tipo=motoboy"
                  className="inline-block px-10 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-xl font-bold hover:bg-white/20 hover:border-white/50 transition-all duration-300"
                >
                  Sou Motoboy
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900/95 backdrop-blur-xl text-white py-12 relative z-10 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <div className="w-10 h-10 relative rounded-xl overflow-hidden">
                <Image src="/icons/app-icon.png" alt="Entrega Pra Mim" fill className="object-cover" />
              </div>
              <span className="font-bold text-gradient">ENTREGA PRA MIM</span>
            </motion.div>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm text-slate-400">
              <a href="mailto:contato@entregapramim.com.br" className="hover:text-cyan-400 transition-colors">
                contato@entregapramim.com.br
              </a>
              <span className="text-slate-500">entregapramim.com.br</span>
            </div>

            <p className="text-sm text-slate-500">
              © 2024 Entrega Pra Mim
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
