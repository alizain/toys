import type { Metadata } from "next"
import { Nunito, Space_Grotesk } from "next/font/google"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import "./globals.css"

const fontHeading = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-heading",
})

const fontSans = Nunito({
	subsets: ["latin"],
	variable: "--font-sans",
})

export const metadata: Metadata = {
	description: "A curated collection of the best toys for kids, rated by real parents.",
	title: "Toys - The Best Toys for Kids",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html
			lang="en"
			className={`${fontHeading.variable} ${fontSans.variable}`}
		>
			<body className="min-h-screen antialiased">
				<NuqsAdapter>{children}</NuqsAdapter>
			</body>
		</html>
	)
}
