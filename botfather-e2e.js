const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  const BASE = 'http://localhost:82';
  const USER = 'test_user_a';
  const PASS = 'testpass123';
  
  console.log('=== 1. 登录 ===');
  await page.goto(BASE);
  await page.waitForTimeout(2000);
  await page.getByPlaceholder('手机号或用户名').fill(USER);
  await page.locator('input[name="password"]').fill(PASS);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  
  try {
    await page.getByRole('button', { name: '登录', exact: true }).waitFor({ state: 'hidden', timeout: 15000 });
    console.log('✅ 登录成功');
  } catch {
    console.log('❌ 登录失败');
    await page.screenshot({ path: '/tmp/e2e-login-fail.png' });
    await browser.close();
    return;
  }
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/e2e-01-main.png' });
  console.log('📸 主界面截图: /tmp/e2e-01-main.png');
  
  // 2. 找到 BotFather 会话
  console.log('\n=== 2. 找 BotFather ===');
  // 搜索 botfather
  const searchInput = await page.$('input[placeholder*="搜索"]');
  if (searchInput) {
    await searchInput.fill('BotFather');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/e2e-02-search.png' });
    console.log('📸 搜索截图: /tmp/e2e-02-search.png');
    
    // 点击搜索结果
    const result = await page.$('text=BotFather');
    if (result) {
      await result.click();
      await page.waitForTimeout(2000);
      console.log('✅ 找到 BotFather');
    } else {
      console.log('❌ 搜索结果中没找到 BotFather');
    }
  } else {
    console.log('⚠️ 没找到搜索框，尝试直接找会话列表');
  }
  
  await page.screenshot({ path: '/tmp/e2e-03-botfather.png' });
  console.log('📸 BotFather 截图: /tmp/e2e-03-botfather.png');
  
  // 3. 发送 /newbot
  console.log('\n=== 3. 发送 /newbot ===');
  const msgInput = await page.$('[contenteditable="true"], textarea[placeholder*="消息"], input[placeholder*="消息"]');
  if (msgInput) {
    await msgInput.click();
    await page.keyboard.type('/newbot');
    await page.keyboard.press('Enter');
    console.log('✅ 发送 /newbot');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/e2e-04-newbot.png' });
    console.log('📸 /newbot 截图: /tmp/e2e-04-newbot.png');
    
    // 4. 发送 Bot 名称
    console.log('\n=== 4. 发送 Bot 名称 ===');
    await page.keyboard.type('E2E全流程Bot');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/e2e-05-name.png' });
    
    // 5. 发送 Username
    console.log('\n=== 5. 发送 Username ===');
    await page.keyboard.type('e2e_full_flow_bot');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/e2e-06-username.png' });
    console.log('📸 创建完成截图: /tmp/e2e-06-username.png');
  } else {
    console.log('❌ 没找到消息输入框');
  }
  
  // 截最终状态
  await page.screenshot({ path: '/tmp/e2e-07-final.png' });
  
  // 获取页面上的最新文本（找 bf_ token）
  const bodyText = await page.textContent('body');
  const tokenMatch = bodyText.match(/bf_[a-f0-9]+/);
  if (tokenMatch) {
    console.log(`\n🎉 获得 Bot Token: ${tokenMatch[0]}`);
  } else {
    console.log('\n⚠️ 页面上未找到 bf_ token');
  }
  
  // 6. 查看群聊
  console.log('\n=== 6. 回到群聊列表 ===');
  // 搜索测试群
  if (searchInput || await page.$('input[placeholder*="搜索"]')) {
    const search2 = await page.$('input[placeholder*="搜索"]');
    if (search2) {
      await search2.fill('AI协作测试群');
      await page.waitForTimeout(2000);
      const groupResult = await page.$('text=AI协作测试群');
      if (groupResult) {
        await groupResult.click();
        await page.waitForTimeout(2000);
        console.log('✅ 进入 AI协作测试群');
        await page.screenshot({ path: '/tmp/e2e-08-group.png' });
      }
    }
  }
  
  await browser.close();
  console.log('\n=== 测试完成 ===');
})();
