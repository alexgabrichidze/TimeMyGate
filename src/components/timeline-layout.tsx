'use client';

import React from 'react';
import { motion } from 'framer-motion';

import { Timeline, TimelineItem } from '@/components/timeline';
import type { TimelineElement } from '@/types';

interface TimelineLayoutProps {
  items: TimelineElement[];
  size?: 'sm' | 'md' | 'lg';
  iconColor?: 'primary' | 'secondary' | 'muted' | 'accent';
  customIcon?: React.ReactNode;
  animate?: boolean;
  connectorColor?: 'primary' | 'secondary' | 'muted' | 'accent';
  className?: string;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.18,
      ease: 'easeOut',
    },
  },
};

export const TimelineLayout = ({
  items,
  size = 'md',
  iconColor,
  customIcon,
  animate = true,
  connectorColor,
  className,
}: TimelineLayoutProps) => {
  if (!animate) {
    return (
      <Timeline size={size} className={className}>
        {[...items].reverse().map((item, index) => (
          <div key={item.id ?? index}>
            <TimelineItem
              date={item.date}
              title={item.title}
              description={item.description}
              icon={typeof item.icon === 'function' ? item.icon() : item.icon || customIcon}
              iconColor={item.color || iconColor}
              status={item.status}
              connectorColor={item.color || connectorColor}
              showConnector={index !== items.length - 1}
            />
          </div>
        ))}
      </Timeline>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <Timeline size={size} className={className}>
        {[...items].reverse().map((item, index) => (
          <motion.div
            key={item.id ?? index}
            variants={itemVariants}
          >
            <TimelineItem
              date={item.date}
              title={item.title}
              description={item.description}
              icon={typeof item.icon === 'function' ? item.icon() : item.icon || customIcon}
              iconColor={item.color || iconColor}
              status={item.status}
              connectorColor={item.color || connectorColor}
              showConnector={index !== items.length - 1}
            />
          </motion.div>
        ))}
      </Timeline>
    </motion.div>
  );
};
