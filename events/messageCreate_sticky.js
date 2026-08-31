module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    // Negeer berichten van bots om een oneindige lus te voorkomen
    if (message.author.bot) return;
    
    if (!client.stickyMessages) return;
    const stickyData = client.stickyMessages.get(message.channel.id);
    if (!stickyData) return;

    try {
      // Verwijder de oude sticky message als die er nog is
      if (stickyData.lastMessageId) {
        const oldMsg = await message.channel.messages.fetch(stickyData.lastMessageId).catch(() => null);
        if (oldMsg) await oldMsg.delete();
      }

      // Stuur een nieuwe sticky message onderaan
      const newMsg = await message.channel.messages.send({
        content: `📌 **Sticky Message:**\n${stickyData.content}`
      });

      // Update het ID van het laatste sticky bericht
      stickyData.lastMessageId = newMsg.id;
    } catch (error) {
      console.error('Error updating sticky message:', error);
    }
  },
};