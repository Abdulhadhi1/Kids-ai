import { motion } from "framer-motion";

export const Loader = () => {
    return (
        <div className="flex justify-center items-center gap-2 p-4">
            <motion.div
                className="w-4 h-4 rounded-full bg-primary"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.div
                className="w-4 h-4 rounded-full bg-accent-pink"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
                className="w-4 h-4 rounded-full bg-accent-green"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            />
        </div>
    );
};
