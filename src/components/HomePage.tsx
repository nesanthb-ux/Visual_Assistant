import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { Bot, Languages } from 'lucide-react';

interface HomePageProps {
    onSelect: (view: 'buddy' | 'translator') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelect }) => {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 100
            }
        }
    };

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center text-white font-sans">
            {/* Background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-slate-900/30 opacity-90" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

            <motion.div 
                className="z-10 flex flex-col items-center gap-12 max-w-4xl w-full px-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="text-center">
                    <motion.h1 
                        className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-4"
                        variants={itemVariants}
                    >
                        Welcome
                    </motion.h1>
                    <motion.p 
                        className="text-xl text-gray-400 font-light"
                        variants={itemVariants}
                    >
                        Choose your assistant mode
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                    <motion.button
                        variants={itemVariants}
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelect('buddy')}
                        className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transition-all group"
                    >
                        <div className="p-4 rounded-full bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                            <Bot className="w-12 h-12" />
                        </div>
                        <h2 className="text-2xl font-semibold">Hey Buddy</h2>
                        <p className="text-gray-400 text-sm text-center">
                            Your personal AI companion for conversation and vision tasks.
                        </p>
                    </motion.button>

                    <motion.button
                        variants={itemVariants}
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(168, 85, 247, 0.1)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelect('translator')}
                        className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transition-all group"
                    >
                        <div className="p-4 rounded-full bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                            <Languages className="w-12 h-12" />
                        </div>
                        <h2 className="text-2xl font-semibold">Live Translator</h2>
                        <p className="text-gray-400 text-sm text-center">
                            Real-time speech translation and synthesized voice responses.
                        </p>
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};
