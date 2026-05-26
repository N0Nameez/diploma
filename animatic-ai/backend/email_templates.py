
def get_html_template(title, content, action_url=None, action_text=None):
    """Base HTML template for emails."""
    logo_url = "https://animaticai.online/images/logo_no_bg.png"
    
    action_button = ""
    if action_url and action_text:
        action_button = f'''
        <tr>
            <td align="center" style="padding: 20px 0;">
                <a href="{action_url}" style="background-color: #EC4899; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    {action_text}
                </a>
            </td>
        </tr>
        '''

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #111111; border: 1px solid #222222; border-radius: 16px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; }}
            .header {{ padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #111111 0%, #1a1a1a 100%); }}
            .content {{ padding: 40px 30px; line-height: 1.6; color: #dddddd; }}
            .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666666; border-top: 1px solid #222222; }}
            h1 {{ color: #ffffff; font-size: 24px; margin-bottom: 20px; font-weight: 700; }}
            p {{ margin-bottom: 20px; font-size: 16px; }}
            .highlight {{ color: #EC4899; font-weight: 600; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="{logo_url}" alt="AnimaticAI Logo" width="120" style="margin-bottom: 20px;">
                <h1>{title}</h1>
            </div>
            <div class="content">
                {content}
                <table width="100%" cellspacing="0" cellpadding="0">
                    {action_button}
                </table>
            </div>
            <div class="footer">
                <p>&copy; 2026 AnimaticAI. Все права защищены.<br>
                Вы получили это письмо, так как зарегистрированы в AnimaticAI.</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_credits_confirmation_html(amount):
    title = "Баланс успешно пополнен!"
    content = f"""
    <p>Здравствуйте!</p>
    <p>Ваш баланс в AnimaticAI успешно пополнен на <span class="highlight">{amount} кредитов</span>.</p>
    <p>Теперь вы можете продолжить создание потрясающих 3D-моделей. Используйте их для генерации новых объектов или улучшения существующих.</p>
    <p>Спасибо, что выбираете нашу платформу!</p>
    """
    return get_html_template(title, content, "https://animaticai.online/profile", "Перейти в профиль")

def get_subscription_confirmation_html(plan_name):
    title = f"Подписка {plan_name} активирована!"
    content = f"""
    <p>Здравствуйте!</p>
    <p>Поздравляем! Ваша подписка <span class="highlight">{plan_name}</span> успешно активирована на 30 дней.</p>
    <p>Теперь вам доступны все возможности выбранного плана:</p>
    <ul style="color: #dddddd; margin-bottom: 20px;">
        <li>Приоритет в очереди генерации</li>
        <li>Доступ к высокополигональным моделям</li>
        <li>Расширенные лимиты хранилища</li>
        <li>Отсутствие водяных знаков</li>
    </ul>
    <p>Желаем творческих успехов!</p>
    """
    return get_html_template(title, content, "https://animaticai.online/generate", "Начать генерацию")

def get_expiration_warning_html(days_left):
    title = "Ваша подписка скоро истекает"
    content = f"""
    <p>Здравствуйте!</p>
    <p>Напоминаем, что ваша подписка AnimaticAI истекает через <span class="highlight">{days_left} дн.</span></p>
    <p>Чтобы сохранить доступ к PRO-функциям и не потерять приоритет в очереди, вы можете продлить подписку в личном кабинете.</p>
    <p>Если у вас включено <span class="highlight">автопродление</span>, списание произойдет автоматически в день окончания текущего периода.</p>
    """
    return get_html_template(title, content, "https://animaticai.online/profile", "Управление подпиской")
def get_subscription_renewal_html(plan_name):
    title = f"Подписка {plan_name} продлена!"
    content = f"""
    <p>Здравствуйте!</p>
    <p>Ваша подписка <span class="highlight">{plan_name}</span> была успешно автоматически продлена еще на 30 дней.</p>
    <p>Мы рады, что вы продолжаете использовать AnimaticAI для ваших 3D-проектов!</p>
    <p>Все ваши PRO-функции и приоритеты сохранены и активны.</p>
    """
    return get_html_template(title, content, "https://animaticai.online/profile", "В личный кабинет")
