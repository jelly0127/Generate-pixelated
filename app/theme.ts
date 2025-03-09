import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const customConfig = defineConfig({});

export const system = createSystem(defaultConfig, customConfig);
