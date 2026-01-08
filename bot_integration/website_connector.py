"""
Website API Connector
ใช้เชื่อมต่อ Discord Bot กับ Status Rental Website
© 2026 Bonchon-Studio

วิธีใช้:
1. Copy ไฟล์นี้ไปวางในโปรเจค Bot
2. เพิ่มใน .env ของ Bot:
   WEBSITE_URL=http://localhost:3000
   BOT_WEBHOOK_SECRET=your_secret_here
3. import แล้วเรียกใช้ functions
"""

import os
import aiohttp
from typing import Optional, Tuple, Dict, Any

# โหลดจาก .env
WEBSITE_URL = os.getenv("WEBSITE_URL", "http://localhost:3000")
BOT_SECRET = os.getenv("BOT_WEBHOOK_SECRET", "")


async def topup_user(discord_id: str, amount: int, reference: str = None) -> Tuple[bool, Dict[str, Any]]:
    """
    เติมเงินให้ User ผ่าน Website API
    
    Args:
        discord_id: Discord ID ของ user (เช่น "123456789012345678")
        amount: จำนวนเงินที่เติม (หน่วย: บาท)
        reference: หมายเลขอ้างอิง (ไม่บังคับ)
    
    Returns:
        (success, data) - success เป็น True/False, data คือ response จาก API
    
    ตัวอย่าง:
        success, data = await topup_user("123456789", 50, "TRX-001")
        if success:
            print(f"เติมเงินสำเร็จ! ยอดใหม่: {data['newBalance']} บาท")
        else:
            print(f"ผิดพลาด: {data.get('error')}")
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{WEBSITE_URL}/api/topup/webhook",
                json={
                    "secret": BOT_SECRET,
                    "discordId": str(discord_id),
                    "amount": int(amount),
                    "reference": reference or f"Bot-Topup-{discord_id}"
                },
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                data = await resp.json()
                return resp.status == 200, data
                
    except Exception as e:
        return False, {"error": str(e)}


async def get_user_status(discord_id: str) -> Tuple[bool, Dict[str, Any]]:
    """
    ดึงข้อมูล Status Config ของ User จาก Website
    
    Args:
        discord_id: Discord ID ของ user
    
    Returns:
        (success, data) - data จะมี user, subscription, statusConfig
    
    ตัวอย่าง:
        success, data = await get_user_status("123456789")
        if success and data.get("statusConfig"):
            config = data["statusConfig"]
            print(f"Page 1: {config['page1_text1']}")
    """
    try:
        headers = {"Authorization": f"Bearer {BOT_SECRET}"}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{WEBSITE_URL}/api/bot/user-status/{discord_id}",
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                data = await resp.json()
                return resp.status == 200, data
                
    except Exception as e:
        return False, {"error": str(e)}


async def check_subscription(discord_id: str) -> Tuple[bool, Optional[Dict]]:
    """
    เช็คว่า User มี Subscription ที่ active อยู่หรือไม่
    
    Returns:
        (has_active_sub, subscription_info)
    """
    success, data = await get_user_status(discord_id)
    
    if not success:
        return False, None
    
    sub = data.get("subscription")
    if sub and sub.get("status") == "active":
        return True, sub
    
    return False, None


# ============================================
# ตัวอย่างการใช้งานกับ discord.py
# ============================================
"""
import discord
from discord.ext import commands
from website_connector import topup_user, get_user_status, check_subscription

bot = commands.Bot(command_prefix="!")

@bot.command()
async def topup(ctx, user: discord.Member, amount: int):
    '''Admin command: เติมเงินให้ user'''
    success, data = await topup_user(str(user.id), amount, f"Admin-{ctx.author.id}")
    
    if success:
        await ctx.send(f"✅ เติมเงิน {amount} บาท ให้ {user.mention} สำเร็จ!")
        await ctx.send(f"💰 ยอดเงินใหม่: {data['newBalance']} บาท")
    else:
        await ctx.send(f"❌ เกิดข้อผิดพลาด: {data.get('error')}")

@bot.command()
async def mystatus(ctx):
    '''เช็คสถานะของตัวเอง'''
    has_sub, sub = await check_subscription(str(ctx.author.id))
    
    if has_sub:
        await ctx.send(f"✅ คุณมีแพ็คเกจ: {sub['package_name']}")
        await ctx.send(f"📅 หมดอายุ: {sub['end_date']}")
    else:
        await ctx.send("❌ คุณยังไม่มีแพ็คเกจ กรุณาซื้อที่เว็บไซต์")
"""
