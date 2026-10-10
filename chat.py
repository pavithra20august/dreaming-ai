import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai

load_dotenv(Path(__file__).parent / ".env", override=True)

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
chat = client.chats.create(
    model="gemini-2.5-flash",
    config={"system_instruction": "You are DreamAI, a warm and curious AI that loves deep conversations. Be casual, friendly, and thoughtful. Keep responses concise but interesting."},
)

print("=" * 50)
print("  DreamAI - Casual Chat")
print("  Type 'quit' or 'exit' to leave")
print("=" * 50)
print()

while True:
    try:
        user_input = input("You: ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\nBye! Sweet dreams.")
        break

    if not user_input:
        continue
    if user_input.lower() in ("quit", "exit", "bye"):
        print("\nDreamAI: Bye! Sweet dreams. 💭")
        break

    response = chat.send_message(user_input)
    print(f"\nDreamAI: {response.text}\n")
