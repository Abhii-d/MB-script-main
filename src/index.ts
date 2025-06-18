// Main entry point for the TypeScript Node.js application

interface WelcomeMessage {
  message: string;
  timestamp: Date;
  version: string;
}

function createWelcomeMessage(): WelcomeMessage {
  return {
    message: "Hello from TypeScript + Node.js!",
    timestamp: new Date(),
    version: "1.0.0"
  };
}

function main(): void {
  const welcome = createWelcomeMessage();
  
  console.log("🚀 Application started successfully!");
  console.log(`📝 ${welcome.message}`);
  console.log(`⏰ Started at: ${welcome.timestamp.toISOString()}`);
  console.log(`📦 Version: ${welcome.version}`);
  
  // Demonstrate TypeScript features
  const numbers: number[] = [1, 2, 3, 4, 5];
  const doubled = numbers.map((n: number) => n * 2);
  
  console.log(`🔢 Original numbers: ${numbers.join(", ")}`);
  console.log(`✨ Doubled numbers: ${doubled.join(", ")}`);
}

// Execute main function
main();
