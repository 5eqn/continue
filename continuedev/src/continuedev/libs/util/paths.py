import os
import sys
from ..constants.main import CONTINUE_SESSIONS_FOLDER, CONTINUE_GLOBAL_FOLDER, CONTINUE_SERVER_FOLDER


def find_data_file(filename):
    if getattr(sys, 'frozen', False):
        # The application is frozen
        datadir = os.path.dirname(sys.executable)
    else:
        # The application is not frozen
        # Change this bit to match where you store your data files:
        datadir = os.path.dirname(__file__)

    return os.path.join(datadir, filename)


def getGlobalFolderPath():
    path = os.path.join(os.path.expanduser("~"), CONTINUE_GLOBAL_FOLDER)
    os.makedirs(path, exist_ok=True)
    return path


def getSessionsFolderPath():
    path = os.path.join(getGlobalFolderPath(), CONTINUE_SESSIONS_FOLDER)
    os.makedirs(path, exist_ok=True)
    return path


def getServerFolderPath():
    path = os.path.join(getGlobalFolderPath(), CONTINUE_SERVER_FOLDER)
    os.makedirs(path, exist_ok=True)
    return path


def getSessionFilePath(session_id: str):
    path = os.path.join(getSessionsFolderPath(), f"{session_id}.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def getDefaultConfigFile() -> str:
    default_config_path = find_data_file(os.path.join(
        "..", "constants", "default_config.py.txt"))
    with open(default_config_path, 'r') as f:
        return f.read()


def getConfigFilePath() -> str:
    path = os.path.join(getGlobalFolderPath(), "config.py")
    os.makedirs(os.path.dirname(path), exist_ok=True)

    if not os.path.exists(path):
        with open(path, 'w') as f:
            f.write(getDefaultConfigFile())

    return path


def getLogFilePath():
    path = os.path.join(getGlobalFolderPath(), "continue.log")
    return path
