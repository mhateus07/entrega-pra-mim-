'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'

// Componente de partículas tech
function TechParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid animado */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

      {/* Linhas de conexão animadas */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        {[...Array(5)].map((_, i) => (
          <motion.line
            key={i}
            x1="0%"
            y1={`${20 + i * 15}%`}
            x2="100%"
            y2={`${25 + i * 12}%`}
            stroke="url(#line-gradient)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 0.5, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5, ease: "linear" }}
          />
        ))}
      </svg>

      {/* Pontos flutuantes */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-cyan-400 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Círculos pulsantes */}
      <motion.div
        className="absolute top-20 right-20 w-96 h-96 rounded-full border border-cyan-500/20"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-40 left-10 w-64 h-64 rounded-full border border-cyan-500/10"
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.05, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
      />
    </div>
  )
}

// Contador animado
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const controls = animate(count, value, { duration: 2, ease: "easeOut" })
    const unsubscribe = rounded.on("change", (v) => setDisplayValue(v))
    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [value, count, rounded])

  return (
    <span className="tabular-nums">
      {displayValue.toLocaleString('pt-BR')}{suffix}
    </span>
  )
}

// Ponto no mapa animado
function MapPoint({ delay, x, y, label }: { delay: number; x: string; y: string; label: string }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: y }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, duration: 0.5, type: 'spring' }}
    >
      <motion.div
        className="relative"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay }}
      >
        <div className="w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.8)]" />
        <motion.div
          className="absolute inset-0 w-4 h-4 bg-cyan-400 rounded-full"
          animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xs text-cyan-300 whitespace-nowrap font-medium">
          {label}
        </span>
      </motion.div>
    </motion.div>
  )
}

// Depoimento card
function TestimonialCard({ name, role, text, rating, delay }: {
  name: string; role: string; text: string; rating: number; delay: number
}) {
  return (
    <motion.div
      className="flex-shrink-0 w-80 p-6 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-cyan-500/20 backdrop-blur-xl"
      initial={{ opacity: 0, x: 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02, borderColor: 'rgba(6,182,212,0.5)' }}
    >
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className={`w-5 h-5 ${i < rating ? 'text-yellow-400' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-slate-300 text-sm mb-4 leading-relaxed">&ldquo;{text}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold">
          {name.charAt(0)}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{name}</p>
          <p className="text-cyan-400 text-xs">{role}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const testimonials = [
    { name: 'Carlos Silva', role: 'E-commerce', text: 'Nunca vi entregas tão rápidas! Meus clientes adoraram. O rastreamento em tempo real é sensacional.', rating: 5 },
    { name: 'Ana Martins', role: 'Restaurante', text: 'Desde que começamos a usar, nossas avaliações de delivery subiram muito. Recomendo demais!', rating: 5 },
    { name: 'Pedro Santos', role: 'Loja Virtual', text: 'Interface intuitiva e motoboys muito profissionais. Melhor plataforma que já usei.', rating: 5 },
    { name: 'Julia Costa', role: 'Farmácia', text: 'Entregas de medicamentos precisam ser rápidas e confiáveis. Encontrei isso aqui.', rating: 4 },
    { name: 'Ricardo Lima', role: 'Escritório', text: 'Para documentos importantes, confio apenas no Entrega Pra Mim. Nunca me decepcionaram.', rating: 5 },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <TechParticles />

      {/* Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-cyan-500/10"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <motion.div
                className="w-10 h-10 sm:w-12 sm:h-12 relative rounded-xl overflow-hidden ring-2 ring-cyan-500/30 group-hover:ring-cyan-400/60 transition-all flex-shrink-0"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Image src="/icons/app-icon.png" alt="Entrega Pra Mim" fill className="object-cover" />
              </motion.div>
              <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent hidden sm:block">
                ENTREGA PRA MIM
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden sm:flex gap-3 items-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/login"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 text-slate-300 hover:text-cyan-400 font-medium rounded-xl hover:bg-cyan-500/10 transition-all duration-200 text-sm sm:text-base"
                >
                  Entrar
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/registro"
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 relative overflow-hidden group text-sm sm:text-base"
                >
                  <span className="relative z-10">Cadastre-se</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </motion.div>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              onClick={() => setMenuOpen(!menuOpen)}
              className="sm:hidden p-2 rounded-xl hover:bg-cyan-500/10 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: menuOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {menuOpen ? (
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </motion.div>
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="sm:hidden border-t border-cyan-500/10"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 py-4 space-y-2 bg-slate-950/95 backdrop-blur-xl">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-slate-300 hover:text-cyan-400 font-medium rounded-xl hover:bg-cyan-500/10 transition-all text-center"
                >
                  Entrar
                </Link>
                <Link
                  href="/registro"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold text-center"
                >
                  Cadastre-se
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div
              className="flex-1 text-center lg:text-left"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                Tecnologia de ponta em logística
              </motion.div>

              <motion.h1
                className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Entregas do{' '}
                <span className="relative">
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    futuro
                  </span>
                  <motion.span
                    className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                  />
                </span>
                , hoje.
              </motion.h1>

              <motion.p
                className="text-lg sm:text-xl text-slate-400 mb-8 max-w-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Plataforma inteligente de logística urbana com rastreamento em tempo real,
                algoritmos de otimização e a maior rede de motoboys da região.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/registro"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold text-lg hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] transition-all duration-300"
                  >
                    Começar Agora
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="#como-funciona"
                    className="inline-flex items-center gap-2 px-8 py-4 border border-cyan-500/30 text-cyan-400 rounded-xl font-semibold text-lg hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Ver Demo
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Hero Visual */}
            <motion.div
              className="flex-1 relative"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="relative w-80 h-80 sm:w-96 sm:h-96 mx-auto">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-full blur-3xl" />

                {/* Rotating ring */}
                <motion.div
                  className="absolute inset-4 border-2 border-dashed border-cyan-500/30 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />

                {/* Logo */}
                <motion.div
                  className="absolute inset-12 rounded-full overflow-hidden ring-4 ring-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.3)]"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Image
                    src="/logo-badge.png"
                    alt="Entrega Pra Mim Logo"
                    fill
                    className="object-cover"
                    priority
                  />
                </motion.div>

                {/* Orbiting elements */}
                <motion.div
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: '50% 200px' }}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/50">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-cyan-500/30 rounded-full flex justify-center pt-2">
            <motion.div
              className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
              animate={{ y: [0, 12, 0], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Stats Section - Contador ao vivo */}
      <section ref={statsRef} className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {[
              { value: 15847, suffix: '+', label: 'Entregas Realizadas', icon: '📦' },
              { value: 342, suffix: '+', label: 'Motoboys Ativos', icon: '🏍️' },
              { value: 98, suffix: '%', label: 'Satisfação', icon: '⭐' },
              { value: 24, suffix: '/7', label: 'Disponibilidade', icon: '🕐' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center p-6 rounded-2xl bg-slate-900/50 border border-cyan-500/10 hover:border-cyan-500/30 transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <span className="text-3xl mb-2 block">{stat.icon}</span>
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  {isVisible && <AnimatedCounter value={stat.value} suffix={stat.suffix} />}
                </div>
                <p className="text-slate-400 text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Mapa Interativo */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Cobertura em{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Tempo Real
              </span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Nossa rede de motoboys cobre toda a região. Veja onde estamos operando agora.
            </p>
          </motion.div>

          <motion.div
            className="relative h-96 rounded-3xl overflow-hidden border border-cyan-500/20 bg-slate-900/50"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            {/* Mapa estilizado */}
            <div className="absolute inset-0 bg-[url('/map-dark.svg')] bg-cover bg-center opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-transparent to-slate-900/80" />

            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />

            {/* Pontos de entrega */}
            <MapPoint delay={0.5} x="20%" y="30%" label="Centro" />
            <MapPoint delay={0.7} x="45%" y="25%" label="Zona Norte" />
            <MapPoint delay={0.9} x="70%" y="35%" label="Zona Leste" />
            <MapPoint delay={1.1} x="30%" y="60%" label="Zona Sul" />
            <MapPoint delay={1.3} x="60%" y="65%" label="Zona Oeste" />
            <MapPoint delay={1.5} x="50%" y="45%" label="Sede" />

            {/* Linhas conectando */}
            <svg className="absolute inset-0 w-full h-full">
              <motion.path
                d="M 100 120 Q 200 100 225 100 Q 300 90 350 140 Q 400 180 300 240 Q 200 280 150 240 Q 100 200 100 120"
                fill="none"
                stroke="rgba(6,182,212,0.3)"
                strokeWidth="2"
                strokeDasharray="5,5"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </svg>

            {/* Status badge */}
            <motion.div
              className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-slate-900/90 backdrop-blur-xl rounded-full border border-cyan-500/30"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1 }}
            >
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-slate-300">12 motoboys online</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Como{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Funciona
              </span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Tecnologia de ponta para simplificar suas entregas
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Solicite',
                desc: 'Informe origem, destino e tipo de entrega. Nossa IA calcula a melhor rota e preço justo.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'Acompanhe',
                desc: 'Rastreamento GPS em tempo real. Saiba exatamente onde está sua entrega a cada momento.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Receba',
                desc: 'Entrega confirmada com foto e assinatura digital. Pagamento seguro e avaliação do serviço.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                className="relative group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative p-8 rounded-2xl bg-slate-900/50 border border-cyan-500/10 group-hover:border-cyan-500/30 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
                      {item.icon}
                    </div>
                    <span className="text-5xl font-bold text-slate-800">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Preços */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Preços{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Transparentes
              </span>
            </h2>
            <p className="text-slate-400">Sem surpresas. Você sabe exatamente quanto vai pagar.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { title: 'Agendada', price: 'R$ 3,00', unit: '/km', desc: 'Agende para data e horário específicos', featured: false },
              { title: 'Documentos', price: 'R$ 3,60', unit: '/km', desc: 'Confirmação de recebimento inclusa', featured: true },
              { title: 'Expressa', price: 'R$ 4,50', unit: '/km', desc: 'Coleta imediata, prioridade máxima', featured: false },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                className={`relative rounded-2xl p-8 text-center transition-all duration-500 ${
                  item.featured
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 scale-105 shadow-2xl shadow-cyan-500/30'
                    : 'bg-slate-900/50 border border-cyan-500/10 hover:border-cyan-500/30'
                }`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8 }}
              >
                {item.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-slate-900 text-xs font-bold rounded-full">
                    POPULAR
                  </span>
                )}
                <h3 className={`font-bold mb-4 ${item.featured ? 'text-white' : 'text-white'}`}>
                  {item.title}
                </h3>
                <div className={`text-4xl font-bold mb-2 ${item.featured ? 'text-white' : 'bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent'}`}>
                  {item.price}
                  <span className={`text-sm font-normal ${item.featured ? 'text-white/70' : 'text-slate-500'}`}>
                    {item.unit}
                  </span>
                </div>
                <p className={`text-sm ${item.featured ? 'text-white/80' : 'text-slate-400'}`}>
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              O que nossos{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                clientes
              </span>{' '}
              dizem
            </h2>
            <p className="text-slate-400">Mais de 15.000 entregas realizadas com sucesso</p>
          </motion.div>

          {/* Carrossel */}
          <div className="relative">
            <motion.div
              className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              {testimonials.map((testimonial, index) => (
                <TestimonialCard
                  key={testimonial.name}
                  {...testimonial}
                  delay={index * 0.1}
                />
              ))}
            </motion.div>

            {/* Gradient fade */}
            <div className="absolute top-0 right-0 bottom-4 w-32 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="relative rounded-3xl p-12 sm:p-20 overflow-hidden"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

            {/* Glow effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-300/30 rounded-full blur-3xl" />

            <div className="relative text-center">
              <motion.h2
                className="text-3xl sm:text-5xl font-bold text-white mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Pronto para revolucionar suas entregas?
              </motion.h2>
              <motion.p
                className="text-white/80 mb-10 max-w-xl mx-auto text-lg"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                Junte-se a milhares de empresas que já confiam em nossa tecnologia.
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/registro?tipo=cliente"
                    className="inline-flex items-center gap-2 px-10 py-4 bg-white text-slate-900 rounded-xl font-bold hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] transition-all duration-300"
                  >
                    Sou Cliente
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/registro?tipo=motoboy"
                    className="inline-flex items-center gap-2 px-10 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-xl font-bold hover:bg-white/20 hover:border-white/50 transition-all duration-300"
                  >
                    Sou Motoboy
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-cyan-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <div className="w-10 h-10 relative rounded-xl overflow-hidden ring-2 ring-cyan-500/30">
                <Image src="/icons/app-icon.png" alt="Entrega Pra Mim" fill className="object-cover" />
              </div>
              <span className="font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                ENTREGA PRA MIM
              </span>
            </motion.div>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm text-slate-400">
              <a href="mailto:contato@entregapramim.com.br" className="hover:text-cyan-400 transition-colors">
                contato@entregapramim.com.br
              </a>
              <a href="https://entregapramim.impulsiodigital.com" className="hover:text-cyan-400 transition-colors">
                entregapramim.impulsiodigital.com
              </a>
            </div>

            <div className="text-center sm:text-right">
              <p className="text-sm text-slate-500">
                © 2026 Entrega Pra Mim. Tecnologia em logística.
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Desenvolvido por{' '}
                <a
                  href="https://www.impulsiodigital.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-500 hover:text-cyan-400 transition-colors font-medium"
                >
                  Impulsio Digital
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
