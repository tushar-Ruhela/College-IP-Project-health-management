import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CapacitorProvider } from './CapacitorProvider';
import { PermissionsProvider } from '@/contexts/PermissionsContext';

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Health Management System - Agentic AI Healthcare Ecosystem",
	description: "The Agentic AI Guardian Revolutionizing Healthcare Access. Connect patients, doctors and hospitals through intelligent AI-powered healthcare solutions.",
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	themeColor: "#83C818", // Green - matches Health Management System branding
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html className="h-full" data-scroll-behavior="smooth" suppressHydrationWarning>
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
			</head>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full overflow-x-hidden`}>
				<CapacitorProvider>
					<PermissionsProvider>
					{children}
					</PermissionsProvider>
				</CapacitorProvider>
			</body>
		</html>
	);
}
