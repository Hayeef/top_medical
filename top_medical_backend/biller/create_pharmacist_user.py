import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from django.contrib.auth.models import User

def create_user():
    email = "topmedicalnatekal@gmail.com"
    username = "topmedicalnatekal@gmail.com"
    password = "Topmedical11@"

    # Check if user already exists
    user = User.objects.filter(email=email).first() or User.objects.filter(username=username).first()
    if user:
        user.username = username
        user.email = email
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.first_name = "Top Medical"
        user.last_name = "Admin"
        user.save()
        print(f"[OK] User {email} updated with new password and superuser permissions.")
    else:
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            first_name="Top Medical",
            last_name="Admin"
        )
        print(f"[OK] Superuser {email} created successfully.")

if __name__ == '__main__':
    create_user()
