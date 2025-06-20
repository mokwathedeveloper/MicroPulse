# 💻 Next.js Frontend Rules

## Structure
- Use pages/ or app/ directory depending on Next.js version
- Organize components under /components
- Use /services for API wrappers
- Use environment variables for API URLs

## Data Fetching
- Use SWR or React Query for client-side data fetching.
- Use getServerSideProps or getStaticProps for pre-rendering.
- Use fetch from the API Gateway only—never call microservices directly.

## Auth
- Store JWT securely (prefer HTTP-only cookies).
- Use a useAuth hook to manage session state.
- Protect pages using middleware or route guards.

## Real-Time Support
- Use WebSockets or polling for features like order status updates.
- Integrate with Kafka/WebSocket-based bridge backend if applicable.

## UI/UX
- Use Tailwind CSS or Chakra UI for styling.
- Create reusable components for forms, modals, and lists.
